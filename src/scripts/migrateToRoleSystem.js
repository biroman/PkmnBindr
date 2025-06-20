import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { UserRoleService } from "../services/UserRoleService";

/**
 * Migration script to transition from email-based ownership to role-based system
 *
 * This script:
 * 1. Identifies the current owner by email
 * 2. Updates their user document with role: 'owner'
 * 3. Ensures all other users have role: 'user'
 * 4. Validates the migration
 * 5. Provides rollback capability
 */

export class RoleMigrationService {
  static MIGRATION_LOG_COLLECTION = "migration_logs";

  /**
   * Main migration function
   * @param {string} ownerEmail - Current owner email from environment
   * @param {boolean} dryRun - If true, only validates without making changes
   * @returns {Object} - Migration result
   */
  static async migrateToRoleSystem(ownerEmail, dryRun = false) {
    const migrationId = `role_migration_${Date.now()}`;
    const migrationLog = {
      id: migrationId,
      timestamp: new Date().toISOString(),
      type: "email_to_role_migration",
      ownerEmail,
      dryRun,
      status: "started",
      changes: [],
      errors: [],
      warnings: [],
    };

    try {
      console.log(
        `🚀 Starting role system migration ${dryRun ? "(DRY RUN)" : ""}`
      );
      console.log(`Owner email: ${ownerEmail}`);

      // Step 1: Validate prerequisites
      const validation = await this.validateMigrationPrerequisites(ownerEmail);
      if (!validation.isValid) {
        migrationLog.status = "failed";
        migrationLog.errors = validation.errors;
        await this.logMigration(migrationLog);
        return {
          success: false,
          errors: validation.errors,
          migrationId,
        };
      }

      // Step 2: Find current owner by email
      const ownerUser = await this.findOwnerByEmail(ownerEmail);
      if (!ownerUser) {
        const error = `Owner user with email ${ownerEmail} not found`;
        migrationLog.status = "failed";
        migrationLog.errors = [error];
        await this.logMigration(migrationLog);
        return {
          success: false,
          errors: [error],
          migrationId,
        };
      }

      console.log(
        `✅ Found owner user: ${ownerUser.uid} (${ownerUser.displayName})`
      );
      migrationLog.ownerUserId = ownerUser.uid;

      // Step 3: Get all users that need role updates
      const usersToUpdate = await this.getUsersNeedingRoleUpdates(
        ownerUser.uid
      );
      console.log(
        `📋 Found ${usersToUpdate.length} users that need role updates`
      );

      // Step 4: Prepare role assignments
      const roleAssignments = this.prepareRoleAssignments(
        usersToUpdate,
        ownerUser.uid
      );
      migrationLog.changes = roleAssignments;

      if (dryRun) {
        console.log("🔍 DRY RUN - Showing planned changes:");
        this.displayPlannedChanges(roleAssignments);
        migrationLog.status = "dry_run_completed";
        await this.logMigration(migrationLog);
        return {
          success: true,
          dryRun: true,
          plannedChanges: roleAssignments,
          migrationId,
        };
      }

      // Step 5: Execute role assignments
      const assignmentResults = await this.executeRoleAssignments(
        roleAssignments
      );
      migrationLog.results = assignmentResults;

      // Step 6: Validate migration success
      const validationResults = await this.validateMigrationResults(
        ownerUser.uid
      );
      migrationLog.validation = validationResults;

      if (validationResults.isValid) {
        migrationLog.status = "completed";
        console.log("🎉 Migration completed successfully!");
        console.log(
          `✅ Owner role assigned to: ${ownerUser.displayName} (${ownerUser.uid})`
        );
        console.log(`✅ ${assignmentResults.usersUpdated} users updated`);
        console.log(`⚠️  ${assignmentResults.warnings.length} warnings`);
      } else {
        migrationLog.status = "completed_with_warnings";
        migrationLog.warnings = validationResults.warnings;
        console.log("⚠️  Migration completed with warnings:");
        validationResults.warnings.forEach((warning) =>
          console.log(`   - ${warning}`)
        );
      }

      await this.logMigration(migrationLog);

      return {
        success: true,
        ownerUser,
        results: assignmentResults,
        validation: validationResults,
        migrationId,
      };
    } catch (error) {
      console.error("❌ Migration failed:", error);
      migrationLog.status = "failed";
      migrationLog.errors = [error.message];
      await this.logMigration(migrationLog);

      return {
        success: false,
        errors: [error.message],
        migrationId,
      };
    }
  }

  /**
   * Validate migration prerequisites
   */
  static async validateMigrationPrerequisites(ownerEmail) {
    const errors = [];
    const warnings = [];

    // Check if owner email is provided
    if (!ownerEmail) {
      errors.push("Owner email is required for migration");
    }

    // Check if email format is valid
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (ownerEmail && !emailRegex.test(ownerEmail)) {
      errors.push("Invalid email format for owner email");
    }

    // Check Firebase connection
    try {
      await getDoc(doc(db, "users", "test_connection"));
    } catch (error) {
      errors.push("Cannot connect to Firebase database");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Find owner user by email
   */
  static async findOwnerByEmail(ownerEmail) {
    try {
      const usersQuery = query(
        collection(db, "users"),
        where("email", "==", ownerEmail)
      );
      const querySnapshot = await getDocs(usersQuery);

      if (querySnapshot.empty) {
        return null;
      }

      // Should only be one user with this email
      const userDoc = querySnapshot.docs[0];
      return {
        uid: userDoc.id,
        ...userDoc.data(),
      };
    } catch (error) {
      console.error("Error finding owner by email:", error);
      throw error;
    }
  }

  /**
   * Get all users that need role updates
   */
  static async getUsersNeedingRoleUpdates(ownerUserId) {
    try {
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);

      const users = [];
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        users.push({
          uid: doc.id,
          currentRole: userData.role || null,
          email: userData.email,
          displayName: userData.displayName,
          isOwner: doc.id === ownerUserId,
        });
      });

      return users;
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }

  /**
   * Prepare role assignments
   */
  static prepareRoleAssignments(users, ownerUserId) {
    return users.map((user) => {
      const newRole =
        user.uid === ownerUserId
          ? UserRoleService.ROLES.OWNER
          : UserRoleService.ROLES.USER;

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        currentRole: user.currentRole,
        newRole,
        needsUpdate: user.currentRole !== newRole,
        isOwnerAssignment: user.uid === ownerUserId,
      };
    });
  }

  /**
   * Display planned changes for dry run
   */
  static displayPlannedChanges(roleAssignments) {
    console.log("\n📋 Planned Role Assignments:");
    console.log("═".repeat(80));

    roleAssignments.forEach((assignment) => {
      if (assignment.needsUpdate) {
        const status = assignment.isOwnerAssignment ? "🔑 OWNER" : "👤 USER";
        console.log(
          `${status} ${assignment.displayName} (${assignment.email})`
        );
        console.log(
          `   Current: ${assignment.currentRole || "none"} → New: ${
            assignment.newRole
          }`
        );
        console.log("");
      }
    });

    const needsUpdate = roleAssignments.filter((a) => a.needsUpdate);
    console.log(`📊 Summary: ${needsUpdate.length} users will be updated`);
  }

  /**
   * Execute role assignments
   */
  static async executeRoleAssignments(roleAssignments) {
    const batch = writeBatch(db);
    const results = {
      usersUpdated: 0,
      errors: [],
      warnings: [],
    };

    for (const assignment of roleAssignments) {
      if (assignment.needsUpdate) {
        try {
          const userRef = doc(db, "users", assignment.uid);
          batch.update(userRef, {
            role: assignment.newRole,
            roleUpdatedAt: new Date(),
            roleUpdatedBy: "system_migration",
            ...(assignment.isOwnerAssignment ? { isFounder: true } : {}),
          });
          results.usersUpdated++;
        } catch (error) {
          results.errors.push({
            uid: assignment.uid,
            error: error.message,
          });
        }
      }
    }

    try {
      await batch.commit();
      console.log(
        `✅ Batch update completed: ${results.usersUpdated} users updated`
      );
    } catch (error) {
      console.error("❌ Batch update failed:", error);
      throw error;
    }

    return results;
  }

  /**
   * Validate migration results
   */
  static async validateMigrationResults(ownerUserId) {
    const warnings = [];
    let ownerRoleAssigned = false;

    try {
      // Check if owner has correct role
      const ownerDoc = await getDoc(doc(db, "users", ownerUserId));
      if (ownerDoc.exists()) {
        const ownerData = ownerDoc.data();
        ownerRoleAssigned = ownerData.role === UserRoleService.ROLES.OWNER;

        if (!ownerRoleAssigned) {
          warnings.push(`Owner user ${ownerUserId} does not have owner role`);
        }
      } else {
        warnings.push(`Owner user document ${ownerUserId} not found`);
      }

      // Check for any users with invalid roles
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);

      let usersChecked = 0;
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        const role = userData.role;

        if (role && !Object.values(UserRoleService.ROLES).includes(role)) {
          warnings.push(`User ${doc.id} has invalid role: ${role}`);
        }
        usersChecked++;
      });

      console.log(`✅ Validation completed: ${usersChecked} users checked`);
    } catch (error) {
      warnings.push(`Validation error: ${error.message}`);
    }

    return {
      isValid: warnings.length === 0,
      ownerRoleAssigned,
      warnings,
    };
  }

  /**
   * Log migration for audit trail
   */
  static async logMigration(migrationLog) {
    try {
      const logRef = doc(db, this.MIGRATION_LOG_COLLECTION, migrationLog.id);
      await updateDoc(logRef, migrationLog).catch(async () => {
        // Document doesn't exist, create it
        await setDoc(logRef, migrationLog);
      });
    } catch (error) {
      console.error("Failed to log migration:", error);
      // Don't fail the migration because of logging issues
    }
  }

  /**
   * Rollback migration (emergency use)
   */
  static async rollbackMigration(migrationId) {
    console.log(`🔄 Starting rollback for migration: ${migrationId}`);

    try {
      // Get migration log
      const logDoc = await getDoc(
        doc(db, this.MIGRATION_LOG_COLLECTION, migrationId)
      );
      if (!logDoc.exists()) {
        throw new Error(`Migration log ${migrationId} not found`);
      }

      const migrationData = logDoc.data();
      const batch = writeBatch(db);
      let rolledBack = 0;

      // Revert role changes
      for (const change of migrationData.changes || []) {
        if (change.needsUpdate) {
          const userRef = doc(db, "users", change.uid);
          batch.update(userRef, {
            role: change.currentRole || null,
            roleUpdatedAt: new Date(),
            roleUpdatedBy: `rollback_${migrationId}`,
          });
          rolledBack++;
        }
      }

      await batch.commit();

      // Update migration log
      await updateDoc(doc(db, this.MIGRATION_LOG_COLLECTION, migrationId), {
        rolledBack: true,
        rollbackTimestamp: new Date().toISOString(),
        rollbackCount: rolledBack,
      });

      console.log(`✅ Rollback completed: ${rolledBack} users reverted`);
      return { success: true, rolledBack };
    } catch (error) {
      console.error("❌ Rollback failed:", error);
      return { success: false, error: error.message };
    }
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const ownerEmail = args[0];
  const dryRun = args.includes("--dry-run");

  if (!ownerEmail) {
    console.error(
      "❌ Usage: node migrateToRoleSystem.js [owner-email] [--dry-run]"
    );
    process.exit(1);
  }

  RoleMigrationService.migrateToRoleSystem(ownerEmail, dryRun)
    .then((result) => {
      if (result.success) {
        console.log("🎉 Migration completed successfully!");
        if (dryRun) {
          console.log("Run without --dry-run to execute the migration");
        }
      } else {
        console.error("❌ Migration failed:", result.errors);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Migration error:", error);
      process.exit(1);
    });
}
