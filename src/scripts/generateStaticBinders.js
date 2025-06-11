import fs from "fs";
import path from "path";

/**
 * Static Binder Generator for SEO
 *
 * This script helps you create static JSON files for featured binders
 * that can be used for SEO without Firebase calls.
 *
 * Usage:
 * 1. Export binder data from your admin interface
 * 2. Run this script to generate static files
 * 3. Static binder pages will load these files instead of Firebase
 */

const STATIC_BINDERS_DIR = path.join(process.cwd(), "public", "static-binders");
const BINDERS_INDEX_FILE = path.join(STATIC_BINDERS_DIR, "index.json");

// Ensure the static binders directory exists
if (!fs.existsSync(STATIC_BINDERS_DIR)) {
  fs.mkdirSync(STATIC_BINDERS_DIR, { recursive: true });
}

/**
 * Generate a SEO-friendly URL slug from binder name
 */
const generateSlug = (name) => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

/**
 * Generate static binder data with SEO metadata
 */
const generateStaticBinder = (binderData, options = {}) => {
  const {
    featured = false,
    customSlug = null,
    seoTitle = null,
    seoDescription = null,
    tags = [],
    category = null,
  } = options;

  const slug = customSlug || generateSlug(binderData.metadata.name);

  // Calculate binder statistics
  const cardCount = Object.keys(binderData.cards || {}).length;
  const uniqueSets = new Set();
  const cardTypes = new Set();

  Object.values(binderData.cards || {}).forEach((card) => {
    if (card?.set?.name) uniqueSets.add(card.set.name);
    if (card?.types) card.types.forEach((type) => cardTypes.add(type));
  });

  const staticBinder = {
    // Basic binder data
    id: binderData.id,
    slug,
    metadata: {
      ...binderData.metadata,
      featured,
      category,
      tags: [...tags],
      statistics: {
        cardCount,
        uniqueSets: uniqueSets.size,
        cardTypes: Array.from(cardTypes),
        lastUpdated: new Date().toISOString(),
      },
    },

    // SEO metadata
    seo: {
      title:
        seoTitle || `${binderData.metadata.name} | Pokemon Card Collection`,
      description:
        seoDescription ||
        binderData.metadata.description ||
        `Explore this amazing Pokemon card collection featuring ${cardCount} cards from ${uniqueSets.size} different sets.`,
      keywords: [
        "pokemon cards",
        "card collection",
        "trading cards",
        ...Array.from(uniqueSets),
        ...tags,
      ].join(", "),
      ogImage: `/static-binders/${slug}/preview.jpg`, // You'll generate this
      canonicalUrl: `/binders/${slug}`,
    },

    // Binder settings and layout
    settings: binderData.settings,

    // Card data (already processed)
    cards: binderData.cards,

    // Generation metadata
    generatedAt: new Date().toISOString(),
    version: "1.0",
  };

  return staticBinder;
};

/**
 * Save static binder to file system
 */
const saveStaticBinder = (staticBinder) => {
  const binderFile = path.join(STATIC_BINDERS_DIR, `${staticBinder.slug}.json`);

  try {
    fs.writeFileSync(binderFile, JSON.stringify(staticBinder, null, 2));
    console.log(`✅ Generated static binder: ${staticBinder.slug}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to save binder ${staticBinder.slug}:`, error);
    return false;
  }
};

/**
 * Update the binders index file for discovery
 */
const updateBindersIndex = (staticBinders) => {
  // Read existing index if it exists
  let existingBinders = [];
  if (fs.existsSync(BINDERS_INDEX_FILE)) {
    try {
      const existingIndex = JSON.parse(
        fs.readFileSync(BINDERS_INDEX_FILE, "utf8")
      );
      existingBinders = existingIndex.binders || [];
    } catch (error) {
      console.log("⚠️  Could not read existing index, creating new one");
    }
  }

  // Create map of new binders for easy lookup
  const newBindersMap = new Map();
  staticBinders.forEach((binder) => {
    const binderInfo = {
      id: binder.id,
      slug: binder.slug,
      name: binder.metadata.name,
      description: binder.metadata.description,
      featured: binder.metadata.featured,
      category: binder.metadata.category,
      tags: binder.metadata.tags,
      statistics: binder.metadata.statistics,
      seo: binder.seo,
      lastUpdated: binder.generatedAt,
    };
    newBindersMap.set(binder.id, binderInfo);
  });

  // Merge: Update existing binders or add new ones
  const mergedBinders = [...existingBinders];

  // Update existing binders or add new ones
  newBindersMap.forEach((newBinder, binderId) => {
    const existingIndex = mergedBinders.findIndex((b) => b.id === binderId);
    if (existingIndex >= 0) {
      // Update existing binder
      mergedBinders[existingIndex] = newBinder;
      console.log(`🔄 Updated existing binder: ${newBinder.slug}`);
    } else {
      // Add new binder
      mergedBinders.push(newBinder);
      console.log(`➕ Added new binder: ${newBinder.slug}`);
    }
  });

  const index = {
    binders: mergedBinders,
    lastUpdated: new Date().toISOString(),
    count: mergedBinders.length,
  };

  try {
    fs.writeFileSync(BINDERS_INDEX_FILE, JSON.stringify(index, null, 2));
    console.log(
      `✅ Updated binders index with ${mergedBinders.length} total binders (${staticBinders.length} processed this session)`
    );
    return true;
  } catch (error) {
    console.error("❌ Failed to update binders index:", error);
    return false;
  }
};

/**
 * Process multiple binders for static generation
 */
const processBinders = (bindersData, optionsMap = {}) => {
  const staticBinders = [];

  bindersData.forEach((binderData) => {
    const options = optionsMap[binderData.id] || {};
    const staticBinder = generateStaticBinder(binderData, options);

    if (saveStaticBinder(staticBinder)) {
      staticBinders.push(staticBinder);
    }
  });

  if (staticBinders.length > 0) {
    updateBindersIndex(staticBinders);
  }

  return staticBinders;
};

/**
 * Example usage for your admin interface
 */
const exampleUsage = () => {
  // This is how you'd use it in your admin interface:
  const exampleBinders = [
    // Your exported binder data from admin
  ];

  const exampleOptions = {
    "binder-id-1": {
      featured: true,
      customSlug: "complete-base-set-collection",
      seoTitle: "Complete Pokemon Base Set Collection | Trading Cards",
      seoDescription:
        "View our complete Pokemon Base Set collection featuring all 102 cards including rare holos and first editions.",
      tags: ["base set", "vintage", "complete", "holos"],
      category: "vintage",
    },
    "binder-id-2": {
      featured: true,
      customSlug: "modern-tournament-deck",
      seoTitle: "Modern Tournament Pokemon Deck | Competitive Cards",
      seoDescription:
        "Explore this competitive Pokemon deck used in modern tournaments with meta cards and strategies.",
      tags: ["tournament", "competitive", "modern", "meta"],
      category: "competitive",
    },
  };

  return processBinders(exampleBinders, exampleOptions);
};

export {
  generateSlug,
  generateStaticBinder,
  saveStaticBinder,
  updateBindersIndex,
  processBinders,
  exampleUsage,
};

// CLI usage
if (process.argv[2] === "example") {
  console.log("🚀 Running example static binder generation...");
  exampleUsage();
}
