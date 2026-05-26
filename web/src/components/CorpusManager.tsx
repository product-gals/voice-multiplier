"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveObservations } from "@/lib/onboarding";

interface RecentPost {
  id: string;
  text: string;
  createdAt: string;
  url: string | null;
}

interface CorpusStatus {
  count: number;
  latestAt: string | null;
  recent: RecentPost[];
}

interface IngestResult {
  inserted: number;
  skippedNoText: number;
  skippedTooShort: number;
  total: number;
  mode: "replace" | "append";
}

function formatDate(iso: string | null): string {
  if (!iso) return "never";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CorpusManager() {
  const [status, setStatus] = useState<CorpusStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lastIngest, setLastIngest] = useState<IngestResult | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as CorpusStatus;
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load corpus status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    refresh();
  }, [refresh]);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    setLastIngest(null);
    setSuggestionCount(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/posts/ingest?mode=replace", {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setLastIngest(body as IngestResult);
      await refresh();
      // Best-effort: ask the extractor for fresh observations from the new
      // corpus. Saved to sessionStorage so the voice page picks them up.
      // Never block the success state on this.
      setSuggesting(true);
      try {
        const sres = await fetch("/api/voice/suggest-from-corpus", {
          method: "POST",
          credentials: "include",
        });
        if (sres.ok) {
          const sbody = (await sres.json()) as { observations: string[] };
          if (sbody.observations.length > 0) {
            saveObservations(sbody.observations);
            setSuggestionCount(sbody.observations.length);
          }
        }
      } catch {
        // suggestions are nice-to-have; swallow
      } finally {
        setSuggesting(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = async () => {
    if (!status || status.count === 0) return;
    const ok = window.confirm(
      `Delete all ${status.count} posts from your corpus? This can't be undone.`,
    );
    if (!ok) return;
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setLastIngest(null);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Corpus</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your LinkedIn post history. Ozzy retrieves from this in draft mode,
          audits it in analyze mode, and the voice profile will get fresh
          suggestions from it after each upload. Upload <code>Shares.csv</code>{" "}
          from your{" "}
          <a
            href="https://www.linkedin.com/help/linkedin/answer/a1339364"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            LinkedIn data export
          </a>
          .
        </p>
      </header>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Posts</div>
                <div className="text-lg font-medium">{status?.count ?? 0}</div>
              </div>
              <div>
                <div className="text-zinc-500 dark:text-zinc-400">Latest post</div>
                <div className="text-lg font-medium">
                  {formatDate(status?.latestAt ?? null)}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <label className="inline-flex">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <span
                  role="button"
                  className={`inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-sm font-medium ${
                    uploading
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                  onClick={() => {
                    if (!uploading) fileInputRef.current?.click();
                  }}
                >
                  {uploading ? "Uploading…" : "Upload Shares.csv"}
                </span>
              </label>
              {status && status.count > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={uploading}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                >
                  Clear corpus
                </button>
              )}
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Upload replaces any existing posts in your corpus.
            </p>

            {lastIngest && (
              <div className="rounded-md border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                Ingested {lastIngest.inserted} posts. Skipped{" "}
                {lastIngest.skippedNoText} with no text and{" "}
                {lastIngest.skippedTooShort} under 20 chars.
              </div>
            )}

            {suggesting && (
              <div className="rounded-md border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 p-3 text-sm text-sky-800 dark:text-sky-200 inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                Reading your posts for voice suggestions…
              </div>
            )}

            {suggestionCount !== null && suggestionCount > 0 && !suggesting && (
              <div className="rounded-md border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/40 p-3 text-sm text-sky-800 dark:text-sky-200 flex items-center justify-between gap-3">
                <span>
                  We took {suggestionCount} note{suggestionCount === 1 ? "" : "s"}{" "}
                  on your style.
                </span>
                <Link
                  href="/voice"
                  className="font-medium underline underline-offset-2 hover:text-sky-900 dark:hover:text-sky-100"
                >
                  Review on Voice page →
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-sm text-red-800 dark:text-red-200">
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {status && status.recent.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Most recent
          </h2>
          <ul className="space-y-2">
            {status.recent.map((p) => (
              <li
                key={p.id}
                className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-3 text-sm"
              >
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  {formatDate(p.createdAt)}
                  {p.url && (
                    <>
                      {" · "}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        view on LinkedIn
                      </a>
                    </>
                  )}
                </div>
                <div className="whitespace-pre-wrap text-zinc-800 dark:text-zinc-200 line-clamp-4">
                  {p.text}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
