import { shareLinkService } from "../services/ShareLinkService.js";
import { anonymousBinderService } from "../services/AnonymousBinderService.js";

/**
 * Debug script to test share link functionality
 */
async function testShareLink(shareId) {
  console.log(`🔍 Testing share link: ${shareId}`);
  console.log("=".repeat(50));

  try {
    // Test 1: Check if share link exists
    console.log("1. Checking if share link exists...");
    const shareData = await shareLinkService.getShareLink(shareId);

    if (!shareData) {
      console.log("❌ Share link not found in database");
      return;
    }

    console.log("✅ Share link found:", {
      shareId: shareData.shareId,
      binderId: shareData.binderId,
      ownerId: shareData.ownerId,
      isActive: shareData.isActive,
      createdAt: shareData.createdAt,
    });

    // Test 2: Validate share access
    console.log("\n2. Validating share access...");
    const validation = await shareLinkService.validateShareAccess(shareId);

    if (!validation.isValid) {
      console.log("❌ Share access invalid:", validation.reason);
      return;
    }

    console.log("✅ Share access valid");

    // Test 3: Try to get shared binder
    console.log("\n3. Testing anonymous binder access...");
    const result = await anonymousBinderService.getSharedBinder(shareId);

    if (!result.success) {
      console.log("❌ Failed to get shared binder:", result.error);
      return;
    }

    console.log("✅ Shared binder accessed successfully:", {
      binderTitle: result.binder?.metadata?.name || "Untitled",
      ownerId: result.owner?.id,
      cardCount: Object.keys(result.binder?.cards || {}).length,
    });

    // Test 4: Generate URL
    console.log("\n4. Testing URL generation...");
    const url = shareLinkService.generateShareUrl(shareId);
    console.log("✅ Generated URL:", url);
  } catch (error) {
    console.error("❌ Error during testing:", error);
  }
}

// Export for use in browser console
window.testShareLink = testShareLink;

export { testShareLink };
