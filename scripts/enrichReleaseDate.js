#!/usr/bin/env node
/*
  Enrich card JSON files with `set.releaseDate` (and optionally `set.name`/`symbol`).

  Usage:
    node scripts/enrichReleaseDate.js [lang]

  - lang defaults to "en" which expects card files under `public/cards/en/`.
  - Reads `src/data/pokemonSets.json` for authoritative release dates.
  - Updates each card file in place (pretty-prints with 2-space indentation).
*/

import fs from "fs/promises";
import path from "path";
import process from "process";

async function main() {
  const lang = process.argv[2] || "en";
  const cardsDir = path.resolve("public", "cards", lang);
  const setsPath = path.resolve("src", "data", "pokemonSets.json");

  // Ensure directories exist
  try {
    await fs.access(cardsDir);
  } catch {
    console.error(`❌ Cards directory not found: ${cardsDir}`);
    process.exit(1);
  }

  let sets;
  try {
    const raw = await fs.readFile(setsPath, "utf8");
    sets = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Failed to read pokemonSets.json at ${setsPath}`);
    console.error(err);
    process.exit(1);
  }

  const dateMap = new Map(
    sets.map((s) => [
      s.id,
      {
        releaseDate: s.releaseDate,
        name: s.name,
        symbol: s.images?.symbol || "",
      },
    ])
  );

  const files = (await fs.readdir(cardsDir)).filter((f) => f.endsWith(".json"));
  console.log(`🔍 Processing ${files.length} card files in ${cardsDir}`);

  let updatedFiles = 0;
  for (const file of files) {
    const full = path.join(cardsDir, file);
    let data;
    try {
      data = JSON.parse(await fs.readFile(full, "utf8"));
    } catch (e) {
      console.warn(`⚠️  Skipping invalid JSON: ${file}`);
      continue;
    }

    let touched = false;
    const enriched = data.map((card) => {
      // Determine set id
      const setId =
        card.set?.id ||
        (typeof card.id === "string" ? card.id.split("-")[0] : null);
      if (!setId || !dateMap.has(setId)) return card; // nothing we can do

      const { releaseDate, name, symbol } = dateMap.get(setId);
      if (!card.set) card.set = { id: setId };
      if (!card.set.releaseDate) {
        card.set.releaseDate = releaseDate;
        touched = true;
      }
      // Optionally also backfill name & symbol for completeness
      if (!card.set.name) card.set.name = name;
      if (!card.set.images?.symbol) {
        card.set.images = card.set.images || {};
        card.set.images.symbol = symbol;
      }
      return card;
    });

    if (touched) {
      await fs.writeFile(full, JSON.stringify(enriched, null, 2));
      updatedFiles++;
      console.log(`✔︎ Updated ${file}`);
    }
  }

  console.log(`🏁 Done. Updated ${updatedFiles}/${files.length} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
