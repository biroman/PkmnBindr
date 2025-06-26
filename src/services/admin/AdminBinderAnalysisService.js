import {
  collection,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../lib/firebase";

/**
 * Admin service for analyzing and cleaning up changelogs across all users
 */
export class AdminBinderAnalysisService {
  static COLLECTION_NAME = "user_binders";

  /**
   * Analyze changelogs across all users' binders in Firebase
   */
  static async analyzeAllChangelogs() {
    try {
      console.log("🔍 Starting global changelog analysis...");

      const results = {
        totalBinders: 0,
        bloatedBinders: [],
        totalChangelogEntries: 0,
        optimisticEntries: 0,
        normalEntries: 0,
        estimatedStorageKB: 0,
        userBreakdown: new Map(),
      };

      // Query all binders from Firebase
      const bindersQuery = collection(db, this.COLLECTION_NAME);
      const snapshot = await getDocs(bindersQuery);

      console.log(`📊 Found ${snapshot.size} total binders in Firebase`);

      snapshot.forEach((doc) => {
        const binder = doc.data();
        const changelogLength = binder.changelog?.length || 0;

        results.totalBinders++;
        results.totalChangelogEntries += changelogLength;

        // Track by user
        const ownerId = binder.ownerId || "unknown";
        if (!results.userBreakdown.has(ownerId)) {
          results.userBreakdown.set(ownerId, {
            binderCount: 0,
            totalEntries: 0,
            bloatedBinders: 0,
            optimisticEntries: 0,
          });
        }

        const userStats = results.userBreakdown.get(ownerId);
        userStats.binderCount++;
        userStats.totalEntries += changelogLength;

        // Check if bloated
        if (changelogLength > 100) {
          const optimisticCount =
            binder.changelog?.filter(
              (entry) => entry.type === "card_moved_optimistic"
            ).length || 0;

          userStats.bloatedBinders++;
          userStats.optimisticEntries += optimisticCount;

          results.bloatedBinders.push({
            id: binder.id,
            docId: doc.id,
            name: binder.metadata?.name || "Unnamed",
            ownerId: ownerId,
            changelogLength,
            optimisticCount,
            estimatedKB: Math.round(
              JSON.stringify(binder.changelog || []).length / 1024
            ),
          });
        }

        // Count optimistic vs normal entries globally
        if (binder.changelog) {
          binder.changelog.forEach((entry) => {
            if (entry.type === "card_moved_optimistic") {
              results.optimisticEntries++;
            } else {
              results.normalEntries++;
            }
          });
        }

        // Estimate storage size
        if (binder.changelog) {
          results.estimatedStorageKB += Math.round(
            JSON.stringify(binder.changelog).length / 1024
          );
        }
      });

      // Sort bloated binders by changelog length
      results.bloatedBinders.sort(
        (a, b) => b.changelogLength - a.changelogLength
      );

      console.log("📈 Analysis complete:", {
        totalBinders: results.totalBinders,
        bloatedBinders: results.bloatedBinders.length,
        optimisticEntries: results.optimisticEntries,
        estimatedStorageKB: results.estimatedStorageKB,
      });

      return { success: true, results };
    } catch (error) {
      console.error("❌ Failed to analyze changelogs:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up changelogs for specific binders
   */
  static async cleanupBinders(binderIds) {
    try {
      console.log(`🧹 Starting cleanup for ${binderIds.length} binders...`);

      const batch = writeBatch(db);
      const results = {
        processed: 0,
        cleaned: 0,
        failed: 0,
        errors: [],
      };

      for (const binderId of binderIds) {
        try {
          const binderRef = doc(db, this.COLLECTION_NAME, binderId);
          const snapshot = await getDocs(
            query(
              collection(db, this.COLLECTION_NAME),
              where("__name__", "==", binderId)
            )
          );

          if (snapshot.empty) {
            results.failed++;
            results.errors.push(`Binder ${binderId} not found`);
            continue;
          }

          const binderDoc = snapshot.docs[0];
          const binder = binderDoc.data();
          const originalLength = binder.changelog?.length || 0;

          if (originalLength <= 100) {
            results.processed++;
            continue; // No cleanup needed
          }

          // Clean up the changelog
          const cleanedBinder = this.cleanupBinderChangelog(binder);

          // Update in Firebase
          batch.update(binderRef, {
            changelog: cleanedBinder.changelog,
            version: cleanedBinder.version,
            lastModified: cleanedBinder.lastModified,
          });

          results.cleaned++;
          results.processed++;

          console.log(
            `✅ Cleaned binder ${
              binder.metadata?.name || binderId
            }: ${originalLength} -> ${cleanedBinder.changelog.length} entries`
          );
        } catch (error) {
          results.failed++;
          results.errors.push(
            `Failed to clean binder ${binderId}: ${error.message}`
          );
        }
      }

      // Commit all updates
      if (results.cleaned > 0) {
        await batch.commit();
        console.log(`🎉 Successfully cleaned ${results.cleaned} binders`);
      }

      return { success: true, results };
    } catch (error) {
      console.error("❌ Failed to cleanup binders:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Clean up a single binder's changelog (same logic as BinderContext)
   */
  static cleanupBinderChangelog(binder) {
    if (!binder.changelog || binder.changelog.length <= 100) {
      return binder;
    }

    let cleanedChangelog = [...binder.changelog];

    // Group entries by card and timestamp to find optimistic/final pairs
    const cardMoves = new Map();

    cleanedChangelog.forEach((entry, index) => {
      if (
        entry.type === "card_moved" ||
        entry.type === "card_moved_optimistic"
      ) {
        const cardId = entry.data?.cardId;
        const timestamp = new Date(entry.timestamp).getTime();

        if (cardId) {
          if (!cardMoves.has(cardId)) {
            cardMoves.set(cardId, []);
          }
          cardMoves.get(cardId).push({ entry, index, timestamp });
        }
      }
    });

    // Find optimistic entries to remove
    const indicesToRemove = new Set();

    cardMoves.forEach((moves) => {
      moves.sort((a, b) => a.timestamp - b.timestamp);

      for (let i = 0; i < moves.length - 1; i++) {
        const currentMove = moves[i];
        const nextMove = moves[i + 1];

        if (
          currentMove.entry.type === "card_moved_optimistic" &&
          nextMove.entry.type === "card_moved" &&
          nextMove.timestamp - currentMove.timestamp < 30000
        ) {
          indicesToRemove.add(currentMove.index);
        }
      }
    });

    // Remove optimistic entries
    if (indicesToRemove.size > 0) {
      cleanedChangelog = cleanedChangelog.filter(
        (_, index) => !indicesToRemove.has(index)
      );
    }

    // Limit to last 100 entries
    if (cleanedChangelog.length > 100) {
      cleanedChangelog = cleanedChangelog.slice(-100);
    }

    return {
      ...binder,
      changelog: cleanedChangelog,
      version: (binder.version || 0) + 1,
      lastModified: new Date().toISOString(),
    };
  }

  /**
   * Get the worst offenders (binders with most changelog entries)
   */
  static async getWorstOffenders(limitCount = 10) {
    try {
      const analysisResult = await this.analyzeAllChangelogs();
      if (!analysisResult.success) {
        return analysisResult;
      }

      const worstOffenders = analysisResult.results.bloatedBinders
        .slice(0, limitCount)
        .map((binder) => ({
          ...binder,
          severity: this.calculateSeverity(
            binder.changelogLength,
            binder.optimisticCount
          ),
        }));

      return { success: true, worstOffenders };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate severity score for a binder
   */
  static calculateSeverity(changelogLength, optimisticCount) {
    const baseScore = Math.min(changelogLength / 100, 10); // 0-10 based on length
    const optimisticRatio = optimisticCount / changelogLength || 0;
    const optimisticBonus = optimisticRatio * 5; // Up to 5 extra points for high optimistic ratio

    return Math.min(baseScore + optimisticBonus, 10);
  }
}

export default AdminBinderAnalysisService;
