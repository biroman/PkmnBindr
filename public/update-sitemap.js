#!/usr/bin/env node

/**
 * Sitemap Updater for Static Binders
 *
 * This script automatically updates the sitemap.xml with entries from static-binders/index.json
 * Run this after generating new static binders to keep your sitemap up to date.
 *
 * Usage: node public/update-sitemap.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_PATH = path.join(__dirname, "sitemap.xml");
const INDEX_PATH = path.join(__dirname, "static-binders", "index.json");
const DOMAIN = "https://pkmnbindr.com";

async function updateSitemap() {
  try {
    console.log("🔄 Updating sitemap.xml with static binder entries...");

    // Check if index.json exists
    if (!fs.existsSync(INDEX_PATH)) {
      console.log(
        "⚠️  No static-binders/index.json found. Generate static binders first."
      );
      return;
    }

    // Read the static binders index
    const indexData = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
    const staticBinders = indexData.binders || [];

    if (staticBinders.length === 0) {
      console.log("⚠️  No static binders found in index.json");
      return;
    }

    // Read current sitemap
    let sitemap = fs.readFileSync(SITEMAP_PATH, "utf8");

    // Remove existing static binder entries
    const staticBinderRegex =
      /\s*<!-- Static Binder Collections[\s\S]*?<!-- Note: Individual user binder pages/;

    // Generate new static binder entries
    const today = new Date().toISOString().split("T")[0];
    const staticBinderEntries = staticBinders
      .map(
        (binder) => `  <url>
    <loc>${DOMAIN}/binders/${binder.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`
      )
      .join("\n");

    const newSection = `  <!-- Static Binder Collections - SEO-optimized public pages -->
${staticBinderEntries}

  <!-- Note: Individual user binder pages`;

    // Replace the section
    sitemap = sitemap.replace(staticBinderRegex, `  ${newSection}`);

    // Write updated sitemap
    fs.writeFileSync(SITEMAP_PATH, sitemap);

    console.log(
      `✅ Successfully updated sitemap.xml with ${staticBinders.length} static binder entries:`
    );
    staticBinders.forEach((binder) => {
      console.log(`   📄 /binders/${binder.slug} - ${binder.name}`);
    });

    console.log("\n🚀 Your sitemap is now ready for search engines!");
    console.log(
      "💡 Don't forget to submit your updated sitemap to Google Search Console"
    );
  } catch (error) {
    console.error("❌ Error updating sitemap:", error.message);
    process.exit(1);
  }
}

// Run the script
updateSitemap();
