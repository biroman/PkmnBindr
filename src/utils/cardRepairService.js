import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query as firestoreQuery,
  where,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { pokemonTcgApi, normalizeCardData } from "../services/pokemonTcgApi";

/**
 * Clean card data by removing undefined values (Firebase doesn't accept undefined)
 */
const cleanCardDataForFirebase = (cardData) => {
  if (!cardData || typeof cardData !== "object") {
    return cardData;
  }

  const cleaned = {};

  Object.entries(cardData).forEach(([key, value]) => {
    if (value === undefined) {
      // Skip undefined values - Firebase doesn't accept them
      return;
    } else if (value === null) {
      // Keep null values as they are valid in Firebase
      cleaned[key] = value;
    } else if (Array.isArray(value)) {
      // Clean arrays recursively
      cleaned[key] = value
        .map((item) =>
          typeof item === "object" ? cleanCardDataForFirebase(item) : item
        )
        .filter((item) => item !== undefined);
    } else if (typeof value === "object") {
      // Clean nested objects recursively
      const cleanedNested = cleanCardDataForFirebase(value);
      if (Object.keys(cleanedNested).length > 0) {
        cleaned[key] = cleanedNested;
      }
    } else {
      // Keep primitive values
      cleaned[key] = value;
    }
  });

  return cleaned;
};

/**
 * Repair incomplete cards that are missing cardData
 */
export class CardRepairService {
  /**
   * Find all incomplete cards in a specific binder
   */
  static async findIncompleteCardsInBinder(
    binderId,
    userId,
    source = "user_binders"
  ) {
    try {
      console.log(
        `[CardRepair] Scanning binder ${binderId} for incomplete cards...`
      );

      let binderDoc;

      if (source === "user_binders") {
        const binderQuery = firestoreQuery(
          collection(db, "user_binders"),
          where("id", "==", binderId),
          where("ownerId", "==", userId)
        );
        const snapshot = await getDocs(binderQuery);
        if (!snapshot.empty) {
          binderDoc = snapshot.docs[0];
        }
      } else if (source === "binders") {
        binderDoc = await getDoc(doc(db, "binders", binderId));
      }

      if (!binderDoc || !binderDoc.exists()) {
        throw new Error(`Binder ${binderId} not found`);
      }

      const binderData = binderDoc.data();
      const incompleteCards = [];

      if (binderData.cards && typeof binderData.cards === "object") {
        Object.entries(binderData.cards).forEach(([position, cardData]) => {
          // Check if this card has metadata but missing cardData
          if (
            cardData &&
            cardData.cardId &&
            !cardData.cardData &&
            !cardData.name &&
            !cardData.image
          ) {
            incompleteCards.push({
              position,
              cardId: cardData.cardId,
              metadata: cardData,
              binderDocId: binderDoc.id,
              binderSource: source,
            });
          }
        });
      }

      console.log(
        `[CardRepair] Found ${incompleteCards.length} incomplete cards in binder ${binderId}`
      );
      return incompleteCards;
    } catch (error) {
      console.error(`[CardRepair] Error scanning binder ${binderId}:`, error);
      throw error;
    }
  }

  /**
   * Preview/fetch card data without saving to Firebase
   * This allows users to review the repaired cards before committing
   */
  static async previewCardRepairs(incompleteCards) {
    try {
      console.log(
        `[CardRepair] Previewing repairs for ${incompleteCards.length} cards...`
      );

      const previewResults = [];

      for (const incompleteCard of incompleteCards) {
        try {
          // Add a small delay to avoid rate limiting
          if (previewResults.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          console.log(
            `[CardRepair] Fetching preview data for ${incompleteCard.cardId}...`
          );

          // Fetch the card data from Pokemon TCG API
          const cardApiData = await pokemonTcgApi.getCard(
            incompleteCard.cardId
          );
          const normalizedCardData = normalizeCardData(cardApiData);

          // Clean the card data to remove undefined values (Firebase doesn't accept them)
          const cleanedCardData = cleanCardDataForFirebase(normalizedCardData);

          // Log what was cleaned for debugging
          const originalKeys = Object.keys(normalizedCardData || {});
          const cleanedKeys = Object.keys(cleanedCardData || {});
          if (originalKeys.length !== cleanedKeys.length) {
            console.log(
              `[CardRepair] Cleaned ${incompleteCard.cardId}: removed ${
                originalKeys.length - cleanedKeys.length
              } undefined fields`
            );
          }

          // Create the preview repair data (not saved to Firebase yet)
          const previewRepairData = {
            ...incompleteCard.metadata, // Keep the original metadata
            cardData: cleanedCardData, // Add the cleaned cardData
          };

          previewResults.push({
            success: true,
            position: incompleteCard.position,
            cardId: incompleteCard.cardId,
            originalMetadata: incompleteCard.metadata,
            fetchedCardData: normalizedCardData, // Keep original for display
            cleanedCardData: cleanedCardData, // Cleaned for Firebase
            previewRepairData: previewRepairData,
            binderInfo: {
              docId: incompleteCard.binderDocId,
              source: incompleteCard.binderSource,
            },
          });

          console.log(
            `[CardRepair] Successfully fetched preview for ${incompleteCard.cardId}`
          );
        } catch (error) {
          console.error(
            `[CardRepair] Failed to fetch preview for ${incompleteCard.cardId}:`,
            error
          );

          previewResults.push({
            success: false,
            position: incompleteCard.position,
            cardId: incompleteCard.cardId,
            error: error.message,
            originalMetadata: incompleteCard.metadata,
            binderInfo: {
              docId: incompleteCard.binderDocId,
              source: incompleteCard.binderSource,
            },
          });
        }
      }

      const successful = previewResults.filter((r) => r.success);
      const failed = previewResults.filter((r) => !r.success);

      console.log(
        `[CardRepair] Preview completed: ${successful.length} successful, ${failed.length} failed`
      );

      return {
        totalCards: incompleteCards.length,
        successful: successful.length,
        failed: failed.length,
        previews: previewResults,
      };
    } catch (error) {
      console.error(`[CardRepair] Error during card preview:`, error);
      throw error;
    }
  }

  /**
   * Commit previewed repairs to Firebase
   * This saves the already-fetched card data to Firebase
   */
  static async commitRepairs(previewResults) {
    try {
      console.log(
        `[CardRepair] Committing ${previewResults.length} repairs to Firebase...`
      );

      const commitResults = [];
      let committed = 0;
      let failed = 0;

      for (const preview of previewResults) {
        if (!preview.success) {
          // Skip failed previews
          commitResults.push({
            success: false,
            cardId: preview.cardId,
            position: preview.position,
            error: "Preview failed - cannot commit",
          });
          failed++;
          continue;
        }

        try {
          // Update the card in Firebase using the previewed data
          const binderRef =
            preview.binderInfo.source === "user_binders"
              ? doc(db, "user_binders", preview.binderInfo.docId)
              : doc(db, "binders", preview.binderInfo.docId);

          await updateDoc(binderRef, {
            [`cards.${preview.position}`]: preview.previewRepairData,
          });

          console.log(
            `[CardRepair] Successfully committed repair for ${preview.cardId} at position ${preview.position}`
          );

          commitResults.push({
            success: true,
            cardId: preview.cardId,
            position: preview.position,
            repairedData: preview.previewRepairData,
          });

          committed++;
        } catch (error) {
          console.error(
            `[CardRepair] Failed to commit repair for ${preview.cardId}:`,
            error
          );

          commitResults.push({
            success: false,
            cardId: preview.cardId,
            position: preview.position,
            error: error.message,
          });

          failed++;
        }
      }

      console.log(
        `[CardRepair] Commit completed: ${committed} committed, ${failed} failed`
      );

      return {
        totalAttempted: previewResults.length,
        committed,
        failed,
        results: commitResults,
      };
    } catch (error) {
      console.error(`[CardRepair] Error during commit:`, error);
      throw error;
    }
  }

  /**
   * Repair a single incomplete card by fetching its data from Pokemon TCG API
   */
  static async repairSingleCard(incompleteCard) {
    try {
      console.log(`[CardRepair] Repairing card ${incompleteCard.cardId}...`);

      // Fetch the card data from Pokemon TCG API
      const cardApiData = await pokemonTcgApi.getCard(incompleteCard.cardId);
      const normalizedCardData = normalizeCardData(cardApiData);

      // Clean the card data to remove undefined values (Firebase doesn't accept them)
      const cleanedCardData = cleanCardDataForFirebase(normalizedCardData);

      console.log(
        `[CardRepair] Fetched card data for ${incompleteCard.cardId}:`,
        cleanedCardData
      );

      // Create the proper card structure
      const repairedCardData = {
        ...incompleteCard.metadata, // Keep the original metadata
        cardData: cleanedCardData, // Add the cleaned cardData
      };

      // Update the card in Firebase
      const binderRef =
        incompleteCard.binderSource === "user_binders"
          ? doc(db, "user_binders", incompleteCard.binderDocId)
          : doc(db, "binders", incompleteCard.binderDocId);

      await updateDoc(binderRef, {
        [`cards.${incompleteCard.position}`]: repairedCardData,
      });

      console.log(
        `[CardRepair] Successfully repaired card ${incompleteCard.cardId} at position ${incompleteCard.position}`
      );

      return {
        success: true,
        cardId: incompleteCard.cardId,
        position: incompleteCard.position,
        repairedData: repairedCardData,
      };
    } catch (error) {
      console.error(
        `[CardRepair] Failed to repair card ${incompleteCard.cardId}:`,
        error
      );

      return {
        success: false,
        cardId: incompleteCard.cardId,
        position: incompleteCard.position,
        error: error.message,
      };
    }
  }

  /**
   * Repair all incomplete cards in a binder
   */
  static async repairAllIncompleteCardsInBinder(
    binderId,
    userId,
    source = "user_binders"
  ) {
    try {
      console.log(
        `[CardRepair] Starting repair of all incomplete cards in binder ${binderId}...`
      );

      const incompleteCards = await this.findIncompleteCardsInBinder(
        binderId,
        userId,
        source
      );

      if (incompleteCards.length === 0) {
        console.log(
          `[CardRepair] No incomplete cards found in binder ${binderId}`
        );
        return {
          totalFound: 0,
          repaired: 0,
          failed: 0,
          results: [],
        };
      }

      console.log(
        `[CardRepair] Repairing ${incompleteCards.length} incomplete cards...`
      );

      const repairResults = [];
      let repaired = 0;
      let failed = 0;

      // Repair cards one by one to avoid rate limiting
      for (const incompleteCard of incompleteCards) {
        try {
          // Add a small delay to avoid rate limiting
          if (repairResults.length > 0) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }

          const result = await this.repairSingleCard(incompleteCard);
          repairResults.push(result);

          if (result.success) {
            repaired++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(
            `[CardRepair] Error repairing card ${incompleteCard.cardId}:`,
            error
          );
          repairResults.push({
            success: false,
            cardId: incompleteCard.cardId,
            position: incompleteCard.position,
            error: error.message,
          });
          failed++;
        }
      }

      console.log(
        `[CardRepair] Repair completed: ${repaired} repaired, ${failed} failed`
      );

      return {
        totalFound: incompleteCards.length,
        repaired,
        failed,
        results: repairResults,
      };
    } catch (error) {
      console.error(`[CardRepair] Error during bulk repair:`, error);
      throw error;
    }
  }

  /**
   * Find all incomplete cards across all binders for a user
   */
  static async findAllIncompleteCardsForUser(userId) {
    try {
      console.log(`[CardRepair] Scanning all binders for user ${userId}...`);

      const allIncompleteCards = [];

      // Check user_binders collection
      const userBindersQuery = firestoreQuery(
        collection(db, "user_binders"),
        where("ownerId", "==", userId)
      );
      const userBindersSnapshot = await getDocs(userBindersQuery);

      for (const binderDoc of userBindersSnapshot.docs) {
        const binderData = binderDoc.data();
        const binderId = binderData.id;

        if (binderData.cards && typeof binderData.cards === "object") {
          Object.entries(binderData.cards).forEach(([position, cardData]) => {
            if (
              cardData &&
              cardData.cardId &&
              !cardData.cardData &&
              !cardData.name &&
              !cardData.image
            ) {
              allIncompleteCards.push({
                binderId,
                binderName: binderData.metadata?.name || "Unnamed Binder",
                position,
                cardId: cardData.cardId,
                metadata: cardData,
                binderDocId: binderDoc.id,
                binderSource: "user_binders",
              });
            }
          });
        }
      }

      // Check global binders collection
      const bindersQuery = firestoreQuery(
        collection(db, "binders"),
        where("ownerId", "==", userId)
      );
      const bindersSnapshot = await getDocs(bindersQuery);

      for (const binderDoc of bindersSnapshot.docs) {
        const binderData = binderDoc.data();
        const binderId = binderData.id || binderDoc.id;

        if (binderData.cards && typeof binderData.cards === "object") {
          Object.entries(binderData.cards).forEach(([position, cardData]) => {
            if (
              cardData &&
              cardData.cardId &&
              !cardData.cardData &&
              !cardData.name &&
              !cardData.image
            ) {
              allIncompleteCards.push({
                binderId,
                binderName:
                  binderData.metadata?.name ||
                  binderData.binderName ||
                  "Unnamed Binder",
                position,
                cardId: cardData.cardId,
                metadata: cardData,
                binderDocId: binderDoc.id,
                binderSource: "binders",
              });
            }
          });
        }
      }

      console.log(
        `[CardRepair] Found ${allIncompleteCards.length} incomplete cards across all binders for user ${userId}`
      );

      return allIncompleteCards;
    } catch (error) {
      console.error(`[CardRepair] Error scanning user binders:`, error);
      throw error;
    }
  }
}

export default CardRepairService;
