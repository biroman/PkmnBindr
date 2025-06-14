#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { DOMParser } from "xmldom";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_PATH = path.join(__dirname, "../public/sitemap.xml");
const BASE_URL = "https://pkmnbindr.com";

function validateSitemap() {
  console.log("🔍 Validating sitemap.xml...\n");

  // Check if sitemap exists
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.error("❌ sitemap.xml not found at:", SITEMAP_PATH);
    process.exit(1);
  }

  // Read and parse XML
  const xmlContent = fs.readFileSync(SITEMAP_PATH, "utf8");
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, "text/xml");

  // Check for parsing errors
  const parserErrors = doc.getElementsByTagName("parsererror");
  if (parserErrors.length > 0) {
    console.error("❌ XML parsing errors found:");
    console.error(parserErrors[0].textContent);
    process.exit(1);
  }

  // Get all URL elements
  const urls = doc.getElementsByTagName("url");
  console.log(`📊 Found ${urls.length} URLs in sitemap\n`);

  const urlList = [];
  const duplicates = new Set();
  const issues = [];

  // Validate each URL
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const loc = url.getElementsByTagName("loc")[0]?.textContent;
    const lastmod = url.getElementsByTagName("lastmod")[0]?.textContent;
    const changefreq = url.getElementsByTagName("changefreq")[0]?.textContent;
    const priority = url.getElementsByTagName("priority")[0]?.textContent;

    if (!loc) {
      issues.push(`URL ${i + 1}: Missing <loc> element`);
      continue;
    }

    // Check for duplicates
    if (urlList.includes(loc)) {
      duplicates.add(loc);
    }
    urlList.push(loc);

    // Validate URL format
    if (!loc.startsWith(BASE_URL)) {
      issues.push(`URL ${i + 1}: Invalid base URL - ${loc}`);
    }

    // Validate lastmod format (YYYY-MM-DD)
    if (lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) {
      issues.push(`URL ${i + 1}: Invalid lastmod format - ${lastmod}`);
    }

    // Validate changefreq
    const validChangefreq = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ];
    if (changefreq && !validChangefreq.includes(changefreq)) {
      issues.push(`URL ${i + 1}: Invalid changefreq - ${changefreq}`);
    }

    // Validate priority (0.0 to 1.0)
    if (priority && (isNaN(priority) || priority < 0 || priority > 1)) {
      issues.push(`URL ${i + 1}: Invalid priority - ${priority}`);
    }

    console.log(`✅ ${loc}`);
    if (lastmod) console.log(`   📅 Last modified: ${lastmod}`);
    if (changefreq) console.log(`   🔄 Change frequency: ${changefreq}`);
    if (priority) console.log(`   ⭐ Priority: ${priority}`);
    console.log("");
  }

  // Report results
  console.log("\n📋 VALIDATION RESULTS:");
  console.log("=".repeat(50));

  if (issues.length === 0 && duplicates.size === 0) {
    console.log("✅ Sitemap is valid! No issues found.");
  } else {
    if (duplicates.size > 0) {
      console.log("\n⚠️  DUPLICATE URLs FOUND:");
      duplicates.forEach((url) => console.log(`   - ${url}`));
    }

    if (issues.length > 0) {
      console.log("\n❌ ISSUES FOUND:");
      issues.forEach((issue) => console.log(`   - ${issue}`));
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total URLs: ${urls.length}`);
  console.log(`   Unique URLs: ${urlList.length - duplicates.size}`);
  console.log(`   Duplicates: ${duplicates.size}`);
  console.log(`   Issues: ${issues.length}`);

  // Blog-specific validation
  const blogUrls = urlList.filter((url) => url.includes("/blog"));
  console.log(`   Blog URLs: ${blogUrls.length}`);

  if (blogUrls.length > 0) {
    console.log("\n📝 BLOG URLS:");
    blogUrls.forEach((url) => {
      const path = url.replace(BASE_URL, "");
      console.log(`   ✅ ${path}`);
    });
  }

  console.log("\n🎉 Validation complete!");
}

// Run validation
try {
  validateSitemap();
} catch (error) {
  console.error("❌ Error during validation:", error.message);
  process.exit(1);
}
