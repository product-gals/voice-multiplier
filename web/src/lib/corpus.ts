// Per-user corpus over public.posts (Supabase). The BM25 index is built per
// request from the signed-in user's rows — no module-scope cache, because the
// cache would be shared across users which RLS protects against at the DB
// layer but would still leak via process memory.
//
// For personal-scale corpora (hundreds to low thousands of posts), the per-
// request rebuild is cheap. If the index ever shows up in a profile, we can
// add an in-memory LRU keyed by user_id.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface CorpusPost {
  id: string;
  text: string;
  createdAt: string;
  url?: string | null;
  reactions?: number | null;
  comments?: number | null;
}

export interface ScoredPost extends CorpusPost {
  score: number;
}

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
  "have", "i", "in", "is", "it", "its", "of", "on", "or", "that", "the",
  "this", "to", "was", "were", "will", "with", "you", "your", "but", "not",
  "if", "do", "does", "did", "so", "we", "they", "them", "our", "us", "me",
  "my", "what", "which", "who", "how", "why", "when", "where",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

interface CorpusIndex {
  posts: CorpusPost[];
  postTokens: string[][];
  postTermFreq: Map<string, number>[];
  docFreq: Map<string, number>;
  avgDocLen: number;
}

interface PostRow {
  id: string;
  text: string;
  created_at: string;
  url: string | null;
  reactions: number | null;
  comments: number | null;
}

async function fetchUserPosts(
  supabase: SupabaseClient,
  userId: string,
): Promise<CorpusPost[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, text, created_at, url, reactions, comments")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`posts query failed: ${error.message}`);
  const rows = (data ?? []) as PostRow[];
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
    url: r.url,
    reactions: r.reactions,
    comments: r.comments,
  }));
}

function buildIndex(posts: CorpusPost[]): CorpusIndex {
  const postTokens = posts.map((p) => tokenize(p.text));
  const postTermFreq = postTokens.map((tokens) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return tf;
  });
  const docFreq = new Map<string, number>();
  for (const tf of postTermFreq) {
    for (const term of tf.keys()) {
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }
  const totalLen = postTokens.reduce((s, t) => s + t.length, 0);
  const avgDocLen = postTokens.length > 0 ? totalLen / postTokens.length : 0;
  return { posts, postTokens, postTermFreq, docFreq, avgDocLen };
}

export async function loadUserCorpus(
  supabase: SupabaseClient,
  userId: string,
): Promise<CorpusIndex> {
  const posts = await fetchUserPosts(supabase, userId);
  return buildIndex(posts);
}

const K1 = 1.2;
const B = 0.75;

export function searchIndex(
  index: CorpusIndex,
  query: string,
  k = 5,
): ScoredPost[] {
  if (index.posts.length === 0) return [];
  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) return [];

  const N = index.posts.length;
  const scores = new Array<number>(N).fill(0);

  for (const term of queryTerms) {
    const df = index.docFreq.get(term) ?? 0;
    if (df === 0) continue;
    const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
    for (let i = 0; i < N; i++) {
      const tf = index.postTermFreq[i].get(term) ?? 0;
      if (tf === 0) continue;
      const docLen = index.postTokens[i].length;
      const norm = 1 - B + B * (docLen / (index.avgDocLen || 1));
      scores[i] += idf * ((tf * (K1 + 1)) / (tf + K1 * norm));
    }
  }

  const ranked: ScoredPost[] = [];
  for (let i = 0; i < N; i++) {
    if (scores[i] > 0) ranked.push({ ...index.posts[i], score: scores[i] });
  }
  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, k);
}

export async function searchUserCorpus(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  k = 5,
): Promise<ScoredPost[]> {
  const index = await loadUserCorpus(supabase, userId);
  return searchIndex(index, query, k);
}

export async function getRecentUserPosts(
  supabase: SupabaseClient,
  userId: string,
  n = 10,
): Promise<CorpusPost[]> {
  // The query already orders by created_at desc; just trim.
  const { data, error } = await supabase
    .from("posts")
    .select("id, text, created_at, url, reactions, comments")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(n);
  if (error) throw new Error(`posts query failed: ${error.message}`);
  const rows = (data ?? []) as PostRow[];
  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
    url: r.url,
    reactions: r.reactions,
    comments: r.comments,
  }));
}

export async function userCorpusSize(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`posts count failed: ${error.message}`);
  return count ?? 0;
}
