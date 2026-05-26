// Parse LinkedIn's data-export Shares.csv into the corpus post shape.
// Used by both the API upload route and the CLI ingest script.
//
// LinkedIn's export columns (current as of 2026): Date, ShareLink,
// ShareCommentary, SharedUrl, MediaUrl, Visibility. We tolerate column-name
// variants and skip rows with no commentary text (pure reshares).

import { parse } from "csv-parse/sync";

export interface ParsedPost {
  id: string;
  text: string;
  createdAt: string;
  url: string | null;
  reactions: number | null;
  comments: number | null;
}

export interface ParseResult {
  posts: ParsedPost[];
  skippedNoText: number;
  skippedTooShort: number;
}

function pick(row: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim().length > 0) return String(v).trim();
  }
  return undefined;
}

// LinkedIn's Shares.csv wraps each paragraph of the post body in literal `"`
// characters — an export-format artifact, NOT quotes the author wrote. After
// csv-parse strips the outer field quotes, every interior line still has stray
// leading/trailing `"` that need stripping. Inline quotes (mid-line) are real
// author content — leave them alone. Then collapse runs of blank lines that
// the wrapper pattern leaves behind.
function cleanLinkedInText(raw: string): string {
  return raw
    .split("\n")
    .map((line) => line.replace(/^"+/, "").replace(/"+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toIso(dateStr: string | undefined): string {
  if (!dateStr) return new Date(0).toISOString();
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function makeId(createdAt: string, index: number): string {
  const stamp = createdAt.replace(/[-:T.Z]/g, "").slice(0, 14);
  return `share_${stamp}_${index}`;
}

export function parseSharesCsv(raw: string): ParseResult {
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    trim: true,
  }) as Record<string, unknown>[];

  const posts: ParsedPost[] = [];
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
  return { posts, skippedNoText, skippedTooShort };
}
