import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { validateRule } from "../lib/rules";

// Collection names
const RULES_COLLECTION = "globalRules";
const RULE_USAGE_COLLECTION = "ruleUsage";

/**
 * Rules Service - Manages global rules and their enforcement
 */
export class RulesService {
  constructor() {
    this.listeners = new Map();
  }

  // CRUD Operations for Rules
  async createRule(ruleData, createdBy) {
    try {
      // Validate rule data
      const validatedRule = validateRule({
        ...ruleData,
        id: "", // Will be set by Firestore
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy,
      });

      const docRef = await addDoc(collection(db, RULES_COLLECTION), {
        ...validatedRule,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update the rule with the generated ID
      await updateDoc(docRef, { id: docRef.id });

      return docRef.id;
    } catch (error) {
      console.error("Error creating rule:", error);
      throw new Error(`Failed to create rule: ${error.message}`);
    }
  }

  async updateRule(ruleId, updates, updatedBy) {
    try {
      const ruleRef = doc(db, RULES_COLLECTION, ruleId);
      const ruleSnap = await getDoc(ruleRef);

      if (!ruleSnap.exists()) {
        throw new Error("Rule not found");
      }

      const currentRule = ruleSnap.data();
      const updatedRule = {
        ...currentRule,
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy,
      };

      // Validate updated rule - convert timestamps to strings for validation
      const ruleForValidation = {
        ...updatedRule,
        createdAt: currentRule.createdAt?.toDate
          ? currentRule.createdAt.toDate().toISOString()
          : currentRule.createdAt,
        updatedAt: new Date().toISOString(),
      };
      validateRule(ruleForValidation);

      await updateDoc(ruleRef, updatedRule);
      return true;
    } catch (error) {
      console.error("Error updating rule:", error);
      throw new Error(`Failed to update rule: ${error.message}`);
    }
  }

  async deleteRule(ruleId) {
    try {
      const batch = writeBatch(db);

      // Delete the rule
      const ruleRef = doc(db, RULES_COLLECTION, ruleId);
      batch.delete(ruleRef);

      // Delete all usage records for this rule
      const usageQuery = query(
        collection(db, RULE_USAGE_COLLECTION),
        where("ruleId", "==", ruleId)
      );
      const usageSnap = await getDocs(usageQuery);
      usageSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error deleting rule:", error);
      throw new Error(`Failed to delete rule: ${error.message}`);
    }
  }

  async getRules(filters = {}) {
    try {
      let q = collection(db, RULES_COLLECTION);

      // Apply filters
      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }
      if (filters.enabled !== undefined) {
        q = query(q, where("enabled", "==", filters.enabled));
      }

      // Order by creation date (newest first)
      q = query(q, orderBy("createdAt", "desc"));

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error fetching rules:", error);
      throw new Error(`Failed to fetch rules: ${error.message}`);
    }
  }

  async getRule(ruleId) {
    try {
      const ruleRef = doc(db, RULES_COLLECTION, ruleId);
      const ruleSnap = await getDoc(ruleRef);

      if (!ruleSnap.exists()) {
        return null;
      }

      return { id: ruleSnap.id, ...ruleSnap.data() };
    } catch (error) {
      console.error("Error fetching rule:", error);
      throw new Error(`Failed to fetch rule: ${error.message}`);
    }
  }

  // Real-time listeners
  subscribeToRules(callback, filters = {}) {
    try {
      let q = collection(db, RULES_COLLECTION);

      // Apply filters
      if (filters.type) {
        q = query(q, where("type", "==", filters.type));
      }
      if (filters.enabled !== undefined) {
        q = query(q, where("enabled", "==", filters.enabled));
      }

      q = query(q, orderBy("createdAt", "desc"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const rules = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          callback(rules);
        },
        (error) => {
          console.error("Error in rules subscription:", error);
          callback(null, error);
        }
      );

      const listenerId = Date.now().toString();
      this.listeners.set(listenerId, unsubscribe);
      return listenerId;
    } catch (error) {
      console.error("Error subscribing to rules:", error);
      throw new Error(`Failed to subscribe to rules: ${error.message}`);
    }
  }

  unsubscribeFromRules(listenerId) {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  // Rule enforcement and usage tracking
  async checkUserRuleUsage(userId, ruleId, resource) {
    try {
      const usageQuery = query(
        collection(db, RULE_USAGE_COLLECTION),
        where("userId", "==", userId),
        where("ruleId", "==", ruleId),
        where("resource", "==", resource)
      );

      const snapshot = await getDocs(usageQuery);
      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error("Error checking rule usage:", error);
      return null;
    }
  }

  async updateUserRuleUsage(userId, ruleId, resource, increment = 1) {
    try {
      const existing = await this.checkUserRuleUsage(userId, ruleId, resource);

      if (existing) {
        // Update existing usage record
        const usageRef = doc(db, RULE_USAGE_COLLECTION, existing.id);
        await updateDoc(usageRef, {
          count: existing.count + increment,
          lastUsed: serverTimestamp(),
        });
      } else {
        // Create new usage record
        await addDoc(collection(db, RULE_USAGE_COLLECTION), {
          userId,
          ruleId,
          resource,
          count: increment,
          lastUsed: serverTimestamp(),
          resetTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // Default 1 hour
        });
      }

      return true;
    } catch (error) {
      console.error("Error updating rule usage:", error);
      return false;
    }
  }

  async resetUserRuleUsage(userId, ruleId, resource, newResetTime) {
    try {
      const existing = await this.checkUserRuleUsage(userId, ruleId, resource);

      if (existing) {
        const usageRef = doc(db, RULE_USAGE_COLLECTION, existing.id);
        await updateDoc(usageRef, {
          count: 0,
          resetTime: newResetTime,
          lastUsed: serverTimestamp(),
        });
      }

      return true;
    } catch (error) {
      console.error("Error resetting rule usage:", error);
      return false;
    }
  }

  // Bulk operations
  async enableRule(ruleId, enabled = true) {
    return this.updateRule(ruleId, { enabled }, "system");
  }

  async bulkUpdateRules(ruleIds, updates) {
    try {
      const batch = writeBatch(db);

      for (const ruleId of ruleIds) {
        const ruleRef = doc(db, RULES_COLLECTION, ruleId);
        batch.update(ruleRef, {
          ...updates,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error bulk updating rules:", error);
      throw new Error(`Failed to bulk update rules: ${error.message}`);
    }
  }

  async bulkDeleteRules(ruleIds) {
    try {
      const batch = writeBatch(db);

      for (const ruleId of ruleIds) {
        // Delete rule
        const ruleRef = doc(db, RULES_COLLECTION, ruleId);
        batch.delete(ruleRef);

        // Delete associated usage records
        const usageQuery = query(
          collection(db, RULE_USAGE_COLLECTION),
          where("ruleId", "==", ruleId)
        );
        const usageSnap = await getDocs(usageQuery);
        usageSnap.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }

      await batch.commit();
      return true;
    } catch (error) {
      console.error("Error bulk deleting rules:", error);
      throw new Error(`Failed to bulk delete rules: ${error.message}`);
    }
  }

  // Analytics and reporting
  async getRuleUsageStats(ruleId) {
    try {
      const usageQuery = query(
        collection(db, RULE_USAGE_COLLECTION),
        where("ruleId", "==", ruleId)
      );

      const snapshot = await getDocs(usageQuery);
      const usageData = snapshot.docs.map((doc) => doc.data());

      return {
        totalUsers: usageData.length,
        totalUsage: usageData.reduce((sum, usage) => sum + usage.count, 0),
        averageUsage:
          usageData.length > 0
            ? usageData.reduce((sum, usage) => sum + usage.count, 0) /
              usageData.length
            : 0,
        lastActivity:
          usageData.length > 0
            ? Math.max(
                ...usageData.map((usage) => new Date(usage.lastUsed).getTime())
              )
            : null,
      };
    } catch (error) {
      console.error("Error getting rule usage stats:", error);
      return null;
    }
  }

  async getUserRuleViolations(userId, days = 30) {
    try {
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const usageQuery = query(
        collection(db, RULE_USAGE_COLLECTION),
        where("userId", "==", userId),
        where("lastUsed", ">=", cutoffDate)
      );

      const snapshot = await getDocs(usageQuery);
      return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error("Error getting user rule violations:", error);
      return [];
    }
  }

  // Cleanup methods
  async cleanupExpiredUsage() {
    try {
      const now = new Date();
      const usageQuery = query(
        collection(db, RULE_USAGE_COLLECTION),
        where("resetTime", "<", now.toISOString())
      );

      const snapshot = await getDocs(usageQuery);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (snapshot.docs.length > 0) {
        await batch.commit();
        console.log(`Cleaned up ${snapshot.docs.length} expired usage records`);
      }

      return snapshot.docs.length;
    } catch (error) {
      console.error("Error cleaning up expired usage:", error);
      return 0;
    }
  }

  // Utility method to check if user is owner
  isOwner(user) {
    // Use role-based owner detection instead of email
    return user?.role === "owner";
  }

  // Cleanup on destruction
  destroy() {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }
}

// Create singleton instance
export const rulesService = new RulesService();
