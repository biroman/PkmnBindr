import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import cliProgress from "cli-progress";

// Resolve __dirname in ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configuration
 */
const API_BASE = "https://api.pokemontcg.io/v2";
const API_KEY = process.env.POKEMONTCG_API_KEY || "";

// Where to put downloaded data
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");
const DIRS = {
  cards: path.join(PUBLIC_DIR, "cards", "en"),
  sets: path.join(PUBLIC_DIR, "sets"),
  types: path.join(PUBLIC_DIR, "types"),
  subtypes: path.join(PUBLIC_DIR, "subtypes"),
  supertypes: path.join(PUBLIC_DIR, "supertypes"),
  rarities: path.join(PUBLIC_DIR, "rarities"),
};

// Ensure directories exist
for (const dir of Object.values(DIRS)) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Fetch with infinite retry (exponential back-off capped at 60s).
 */
async function fetchWithRetry(url, options = {}, attempt = 0) {
  const MAX_BACKOFF = 60_000; // 60s
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  while (true) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(API_KEY ? { "X-Api-Key": API_KEY } : {}),
          ...options.headers,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      const backoff = 1000; // retry every 1s
      console.warn(`Request failed (${err}). Retrying in ${backoff}ms…`);
      await delay(backoff);
      attempt += 1;
    }
  }
}

/**
 * Download full paginated collection.
 */
async function fetchAll(endpoint) {
  const PAGE_SIZE = 250; // API max
  let page = 1;
  let out = [];
  while (true) {
    const res = await fetchWithRetry(
      `${API_BASE}${endpoint}${
        endpoint.includes("?") ? "&" : "?"
      }page=${page}&pageSize=${PAGE_SIZE}`
    );
    const json = await res.json();
    out = out.concat(json.data);
    if (out.length >= json.totalCount) break;
    page += 1;
  }
  return out;
}

async function downloadSets() {
  const sets = await fetchAll("/sets");
  fs.writeFileSync(
    path.join(DIRS.sets, "sets.json"),
    JSON.stringify(sets, null, 2)
  );
  return sets;
}

async function downloadReference(name) {
  const res = await fetchWithRetry(`${API_BASE}/${name}`);
  const json = await res.json();
  fs.writeFileSync(
    path.join(DIRS[name], `${name}.json`),
    JSON.stringify(json.data ?? json, null, 2)
  );
}

async function downloadCardsBySet(setId) {
  const filePath = path.join(DIRS.cards, `${setId}.json`);
  if (fs.existsSync(filePath)) {
    console.log(`Skip ${setId}, file exists.`);
    return;
  }
  const cards = await fetchAll(`/cards?q=set.id:${setId}`);
  fs.writeFileSync(filePath, JSON.stringify(cards, null, 2));
  console.log(`Saved ${cards.length} cards for set ${setId}`);
}

async function main() {
  // 1) Fetch list of sets
  const setsSpinner = ora({
    text: "Fetching set list…",
    color: "cyan",
  }).start();
  const sets = await downloadSets();
  setsSpinner.succeed(chalk.green(`Fetched ${sets.length} sets`));

  // 2) Download reference data
  const refSpinner = ora({
    text: "Downloading reference data…",
    color: "cyan",
  }).start();
  await Promise.all([
    downloadReference("types"),
    downloadReference("subtypes"),
    downloadReference("supertypes"),
    downloadReference("rarities"),
  ]);
  refSpinner.succeed(chalk.green("Reference data downloaded"));

  // 3) Download card data per set with progress bar
  console.log(); // blank line for spacing
  const progress = new cliProgress.SingleBar(
    {
      format: `${chalk.blue(
        "{bar}"
      )} {percentage}% | {value}/{total} sets | {setId}`,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );
  progress.start(sets.length, 0, { setId: "" });

  for (const set of sets) {
    progress.update(progress.value, { setId: set.id });
    await downloadCardsBySet(set.id);
    progress.increment();
  }
  progress.stop();
  console.log(chalk.green("All done."));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
