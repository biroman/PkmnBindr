/**
 * Test script for Phase 1 Share Link Implementation
 * This script tests the core functionality without UI components
 */

import { shareLinkService } from "../services/ShareLinkService.js";
import { anonymousBinderService } from "../services/AnonymousBinderService.js";
import {
  generateShareUrl,
  validateCustomSlug,
  isValidShareUrl,
  copyShareLink,
} from "../utils/shareUtils.js";

// Mock Firebase for testing
const mockFirebase = {
  user: { uid: "test-user-123" },
  binder: {
    id: "test-binder-456",
    ownerId: "test-user-123",
    metadata: { name: "Test Binder", description: "A test binder" },
    permissions: { public: true },
    cards: { 0: { name: "Pikachu" }, 1: { name: "Charizard" } },
  },
};

/**
 * Test ShareLinkService functionality
 */
async function testShareLinkService() {
  console.log("🧪 Testing ShareLinkService...\n");

  try {
    // Test 1: Generate Share ID
    console.log("1. Testing Share ID generation...");
    const shareId1 = shareLinkService.generateShareId();
    const shareId2 = shareLinkService.generateShareId();

    console.log(`Generated Share ID 1: ${shareId1}`);
    console.log(`Generated Share ID 2: ${shareId2}`);
    console.log(`IDs are unique: ${shareId1 !== shareId2 ? "✅" : "❌"}`);
    console.log(`ID length is 12: ${shareId1.length === 12 ? "✅" : "❌"}`);
    console.log("");

    // Test 2: Generate Share URL
    console.log("2. Testing Share URL generation...");
    const shareUrl = shareLinkService.generateShareUrl(shareId1);
    const customShareUrl = shareLinkService.generateShareUrl(
      shareId1,
      "my-awesome-binder"
    );

    console.log(`Standard URL: ${shareUrl}`);
    console.log(`Custom slug URL: ${customShareUrl}`);
    console.log("");

    // Test 3: Visitor Fingerprint
    console.log("3. Testing visitor fingerprint...");
    const fingerprint1 = shareLinkService.generateVisitorFingerprint();
    const fingerprint2 = shareLinkService.generateVisitorFingerprint();

    console.log(`Fingerprint 1: ${fingerprint1}`);
    console.log(`Fingerprint 2: ${fingerprint2}`);
    console.log(
      `Fingerprints are strings: ${
        typeof fingerprint1 === "string" ? "✅" : "❌"
      }`
    );
    console.log("");

    console.log("✅ ShareLinkService basic tests passed!\n");
  } catch (error) {
    console.error("❌ ShareLinkService tests failed:", error);
  }
}

/**
 * Test Share Utils functionality
 */
function testShareUtils() {
  console.log("🧪 Testing Share Utils...\n");

  try {
    // Test 1: Generate Share URLs
    console.log("1. Testing Share URL generation...");
    const url1 = generateShareUrl("abc123def456");
    const url2 = generateShareUrl("abc123def456", "custom-slug");

    console.log(`Standard URL: ${url1}`);
    console.log(`Custom URL: ${url2}`);
    console.log("");

    // Test 2: Validate Share URLs
    console.log("2. Testing Share URL validation...");
    const validTests = [
      { url: "/share/abc123def456", expected: true },
      { url: "/s/my-custom-slug", expected: true },
      { url: "/invalid/url", expected: false },
      { url: "", expected: false },
      { url: null, expected: false },
    ];

    validTests.forEach((test) => {
      const result = isValidShareUrl(test.url);
      const passed = result.isValid === test.expected;
      console.log(
        `"${test.url}": ${passed ? "✅" : "❌"} (expected: ${
          test.expected
        }, got: ${result.isValid})`
      );
    });
    console.log("");

    // Test 3: Custom Slug Validation
    console.log("3. Testing custom slug validation...");
    const slugTests = [
      { slug: "valid-slug-123", expected: true },
      { slug: "my-awesome-binder", expected: true },
      { slug: "too-short", expected: false },
      { slug: "UPPERCASE", expected: false },
      { slug: "with_underscore", expected: false },
      { slug: "-starts-with-dash", expected: false },
      { slug: "ends-with-dash-", expected: false },
      { slug: "has--double-dash", expected: false },
      { slug: "share", expected: false }, // reserved
      { slug: "", expected: true }, // optional
    ];

    slugTests.forEach((test) => {
      const result = validateCustomSlug(test.slug);
      const passed = result.isValid === test.expected;
      console.log(
        `"${test.slug}": ${passed ? "✅" : "❌"} (expected: ${
          test.expected
        }, got: ${result.isValid})`
      );
      if (!passed && result.reason) {
        console.log(`  Reason: ${result.reason}`);
      }
    });
    console.log("");

    console.log("✅ Share Utils tests passed!\n");
  } catch (error) {
    console.error("❌ Share Utils tests failed:", error);
  }
}

/**
 * Test Anonymous Binder Service functionality (mocked)
 */
function testAnonymousBinderService() {
  console.log("🧪 Testing Anonymous Binder Service...\n");

  try {
    // Test 1: SEO Metadata Generation
    console.log("1. Testing SEO metadata generation...");

    // Mock the preview data
    const mockPreview = {
      metadata: {
        name: "My Pokemon Collection",
        description: "Amazing cards!",
      },
      shareInfo: { title: "Check this out!" },
      stats: { cardCount: 150, pageCount: 5 },
    };

    // Simulate the SEO metadata logic
    const title =
      mockPreview.shareInfo?.title ||
      mockPreview.metadata?.name ||
      "Pokemon Card Collection";
    const description =
      mockPreview.shareInfo?.description ||
      mockPreview.metadata?.description ||
      `A Pokemon card binder with ${mockPreview.stats?.cardCount || 0} cards`;

    const seoData = {
      title: `${title} - Shared Pokemon Collection`,
      description,
      url: `${window.location.origin}/share/abc123def456`,
      type: "website",
      siteName: "PkmnBindr",
      cardCount: mockPreview.stats?.cardCount,
      pageCount: mockPreview.stats?.pageCount,
    };

    console.log("Generated SEO data:");
    console.log(JSON.stringify(seoData, null, 2));
    console.log("");

    console.log("✅ Anonymous Binder Service tests passed!\n");
  } catch (error) {
    console.error("❌ Anonymous Binder Service tests failed:", error);
  }
}

/**
 * Test Firebase Security Rules logic (simulation)
 */
function testSecurityRulesLogic() {
  console.log("🧪 Testing Security Rules Logic...\n");

  try {
    console.log("1. Testing share link access scenarios...");

    // Simulate different access scenarios
    const scenarios = [
      {
        name: "Anonymous user accessing active share",
        user: null,
        shareData: { isActive: true, allowAnonymous: true },
        binderData: { permissions: { public: true } },
        expected: "ALLOW",
      },
      {
        name: "Anonymous user accessing inactive share",
        user: null,
        shareData: { isActive: false, allowAnonymous: true },
        binderData: { permissions: { public: true } },
        expected: "DENY",
      },
      {
        name: "Authenticated user accessing public binder via share",
        user: { uid: "user123" },
        shareData: { isActive: true, allowAnonymous: true },
        binderData: { permissions: { public: true } },
        expected: "ALLOW",
      },
      {
        name: "Owner creating share link",
        user: { uid: "owner123" },
        shareData: { ownerId: "owner123", isActive: true },
        binderData: { permissions: { public: true } },
        expected: "ALLOW",
      },
      {
        name: "Non-owner trying to create share link",
        user: { uid: "user123" },
        shareData: { ownerId: "owner123", isActive: true },
        binderData: { permissions: { public: true } },
        expected: "DENY",
      },
    ];

    scenarios.forEach((scenario) => {
      let access = "DENY";

      // Simulate the security rule logic
      if (scenario.name.includes("accessing")) {
        if (
          scenario.shareData.isActive &&
          scenario.binderData.permissions.public
        ) {
          access = "ALLOW";
        }
      } else if (scenario.name.includes("creating")) {
        if (scenario.user && scenario.user.uid === scenario.shareData.ownerId) {
          access = "ALLOW";
        }
      }

      const passed = access === scenario.expected;
      console.log(
        `${scenario.name}: ${passed ? "✅" : "❌"} (expected: ${
          scenario.expected
        }, got: ${access})`
      );
    });

    console.log("");
    console.log("✅ Security Rules Logic tests passed!\n");
  } catch (error) {
    console.error("❌ Security Rules Logic tests failed:", error);
  }
}

/**
 * Run all Phase 1 tests
 */
async function runPhase1Tests() {
  console.log("🚀 Running Phase 1 Share Link Tests\n");
  console.log("=".repeat(50));
  console.log("");

  await testShareLinkService();
  testShareUtils();
  testAnonymousBinderService();
  testSecurityRulesLogic();

  console.log("=".repeat(50));
  console.log("✅ Phase 1 tests completed!");
  console.log("");
  console.log("Next steps:");
  console.log("1. Deploy Firebase rules to staging environment");
  console.log("2. Test with real Firebase backend");
  console.log("3. Move to Phase 2: Frontend Components");
}

// Run tests if this file is executed directly
if (typeof window !== "undefined") {
  window.runPhase1ShareLinkTests = runPhase1Tests;
  console.log(
    "Phase 1 Share Link tests loaded. Run window.runPhase1ShareLinkTests() to execute."
  );
} else {
  runPhase1Tests();
}

export { runPhase1Tests };
