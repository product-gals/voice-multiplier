import { promises as fs } from "node:fs";
import path from "node:path";

export interface CorpusPost {
  id: string;
  text: string;
  createdAt: string;
  url?: string;
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

let cached: CorpusIndex | null = null;
let cacheLoadPromise: Promise<CorpusIndex> | null = null;

function corpusPath(): string {
  return path.join(process.cwd(), "data", "posts.json");
}

async function readCorpusFile(): Promise<CorpusPost[]> {
  try {
    const raw = await fs.readFile(corpusPath(), "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is CorpusPost =>
        p != null &&
        typeof p === "object" &&
        typeof p.id === "string" &&
        typeof p.text === "string"
    );
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return [];
    throw e;
  }
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

export async function loadCorpus(): Promise<CorpusIndex> {
  if (cached) return cached;
  if (!cacheLoadPromise) {
    cacheLoadPromise = readCorpusFile().then((posts) => {
      cached = buildIndex(posts);
      return cached;
    });
  }
  return cacheLoadPromise;
}

const K1 = 1.2;
const B = 0.75;

export async function searchCorpus(
  query: string,
  k = 5
): Promise<ScoredPost[]> {
  const index = await loadCorpus();
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

export async function corpusSize(): Promise<number> {
  const index = await loadCorpus();
  return index.posts.length;
}

export async function getRecentPosts(n = 10): Promise<CorpusPost[]> {
  const index = await loadCorpus();
  return [...index.posts]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .slice(0, n);
}
