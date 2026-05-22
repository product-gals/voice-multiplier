#!/usr/bin/env node
// Ingest a LinkedIn data-export Shares.csv into web/data/posts.json so the
// originator can retrieve from your post history. Run: npm run ingest -- /path/to/Shares.csv
//
// LinkedIn's export columns (current as of 2026): Date, ShareLink, ShareCommentary,
// SharedUrl, MediaUrl, Visibility. We tolerate column-name variants and skip
// rows with no commentary text (pure reshares with no original write-up).

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(SCRIPT_DIR, "..");
const OUT_PATH = path.join(WEB_DIR, "data", "posts.json");

function usage() {
  console.error("Usage: npm run ingest -- /path/to/Shares.csv");
  process.exit(1);
}

function pick(row, ...keys) {
  for (const k of keys) {
    if (row[k] != null && String(row[k]).trim().length > 0) {
      return String(row[k]).trim();
    }
  }
  return undefined;
}

// LinkedIn's Shares.csv wraps each paragraph of the post body in literal `"`
// characters — an export-format artifact, NOT quotes the author wrote. After
// csv-parse strips the outer field quotes, every interior line still has stray
// leading/trailing `"` that need stripping. Inline quotes (mid-line) are real
// author content — leave them alone. Then collapse runs of blank lines that
// the wrapper pattern leaves behind.
function cleanLinkedInText(raw) {
  return raw
    .split("\n")
    .map((line) => line.replace(/^"+/, "").replace(/"+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toIso(dateStr) {
  if (!dateStr) return new Date(0).toISOString();
  // LinkedIn format is typically "2024-03-15 18:20:00" or ISO; both parse.
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function makeId(createdAt, index) {
  const stamp = createdAt.replace(/[-:T.Z]/g, "").slice(0, 14);
  return `share_${stamp}_${index}`;
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) usage();

  const abs = path.isAbsolute(csvPath) ? csvPath : path.resolve(process.cwd(), csvPath);
  let raw;
  try {
    raw = await fs.readFile(abs, "utf8");
  } catch (e) {
    console.error(`Could not read CSV at ${abs}: ${e.message}`);
    process.exit(1);
  }

  let rows;
  try {
    rows = parse(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (e) {
    console.error(`CSV parse failed: ${e.message}`);
    process.exit(1);
  }

  const posts = [];
  let skippedNoText = 0;
  let skippedTooShort = 0;

  rows.forEach((row, i) => {
    const rawText = pick(row, "ShareCommentary", "Commentary", "Content");
    if (!rawText) {
      skippedNoText++;
      return;
    }
    const text = cleanLinkedInText(rawText);
    if (text.length < 20) {
      skippedTooShort++;
      return;
    }
    const createdAt = toIso(pick(row, "Date", "PostedAt", "CreatedAt"));
    posts.push({
      id: makeId(createdAt, i),
      text,
      createdAt,
      url: pick(row, "ShareLink", "PostLink", "Url") ?? null,
      reactions: null,
      comments: null,
    });
  });

  posts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(posts, null, 2), "utf8");

  console.log(`Ingested ${posts.length} posts → ${path.relative(WEB_DIR, OUT_PATH)}`);
  console.log(
    `  skipped: ${skippedNoText} with no text, ${skippedTooShort} under 20 chars`
  );
  if (posts.length > 0) {
    console.log(`  date range: ${posts[posts.length - 1].createdAt} → ${posts[0].createdAt}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
