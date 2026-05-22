# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: Voice Multiplier (v0)

A Next.js app that takes one LinkedIn post and reformats it for five target platforms — X, Threads, Substack Notes, Instagram, TikTok — while honoring a user-specific voice profile. There is no backend database; the voice profile lives in `localStorage` and is sent with every generate request.

## Commands

The Next.js app lives in [web/](web/). All npm commands must be run from `web/`, not the repo root.

```bash
cd web
npm install
npm run dev    # http://localhost:3000
npm run build
npm run start
npm run lint   # eslint (config: web/eslint.config.mjs)
```

There is no test suite.

Anthropic API key is required at runtime. Create `web/.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

API routes return a 503 with a clear message if it's missing.

## Architecture

### Three user flows

1. **`/onboarding`** ([web/src/app/onboarding/page.tsx](web/src/app/onboarding/page.tsx)) — first-time intake. Collects identity + 2-3 example posts, sends them to `POST /api/onboarding/extract`, which uses **Haiku** to infer voice/rhythm/punctuation/signature-moves, then [`buildProfileFromOnboarding`](web/src/lib/onboarding.ts) merges that with identity into a `VoiceProfile` saved to `localStorage`.
2. **`/write` (Ozzy chat / originator)** ([web/src/components/Writer.tsx](web/src/components/Writer.tsx)) — chat-style writing partner named Ozzy. User types a topic / angle / revision feedback, Ozzy returns a reply + (optionally) a draft. Multi-turn conversation. Sends to `POST /api/draft`. See "Originator" section below.
3. **`/` (Generator / multiplier)** ([web/src/components/Generator.tsx](web/src/components/Generator.tsx)) — takes a finished LinkedIn post and fires one `POST /api/generate` per enabled target in parallel; supports per-card regeneration with feedback. First-time visitors with no stored profile are redirected to `/onboarding`.

There's also `/voice` ([web/src/app/voice/page.tsx](web/src/app/voice/page.tsx)) for editing the profile.

### The `VoiceProfile` is the central data structure

Defined in [web/src/lib/voice-profile.ts](web/src/lib/voice-profile.ts). It's persisted only in `localStorage` under key `voice_profile_v1` — no server-side storage. `loadProfile()` falls back to `SAMPLE_PROFILE` when nothing is stored; `hasStoredProfile()` is how the Generator decides whether to redirect to onboarding. If you change the shape, bump `version` and handle migration in `loadProfile`.

`platform_rules` on the profile is a `Record<Target, { rules: PlatformRule[] }>` — these are *user-specific* learned/manual rules (e.g., "X posts under 220 chars"), distinct from the hardcoded platform constraints in `PLATFORM_RULES`.

### System prompt assembly

[`buildSystemPrompt(profile, target)`](web/src/lib/prompts.ts) composes the system message in a fixed order:

1. Task framing ("You are reformatting a LinkedIn post for...")
2. `PLATFORM_RULES[target]` — hardcoded per-platform constraints from [web/src/lib/platform-rules.ts](web/src/lib/platform-rules.ts) (char limits, forbidden patterns, hook priority, etc.)
3. Rendered voice profile (identity, voice, rhythm, vocabulary, punctuation, signature moves, nouns library)
4. Active user-specific platform rules (hard rules + soft preferences, rendered separately)
5. Strict JSON output spec

The whole system prompt is sent with `cache_control: { type: "ephemeral" }` so the profile + platform rules cache across requests in a session.

The model **must** return JSON matching `{ output, fit_score, fit_flag, char_count, format_variant }`. [`extractJson`](web/src/app/api/generate/route.ts) tries a direct `JSON.parse` and falls back to extracting the first `{...}` block. If parsing fails the route returns a 502 with a snippet of the raw text — useful when prompt changes break the contract.

### Models

[web/src/lib/model-settings.ts](web/src/lib/model-settings.ts) defines the three selectable models (Opus 4.7, Sonnet 4.6, Haiku 4.5). Generator default is `claude-sonnet-4-6`; onboarding extractor is hardcoded to `claude-haiku-4-5`. User's selection is persisted to `localStorage` under `multiplier_model_v1`. Always validate incoming model IDs with `isValidModel` — the API route falls back to the default if the request specifies an unknown one.

### Rate limiting

[web/src/lib/rate-limit.ts](web/src/lib/rate-limit.ts) is an **in-memory** sliding-window limiter (6 req / 30s per IP). The file comment is explicit: single-instance only. On Vercel each serverless instance has its own bucket, so this is a prototype safety net, not real protection. Don't treat it as production-grade.

### Regeneration with feedback

The Generator can regenerate one card with user feedback (e.g., "too long", "weak hook"). It sends `previous_output` + `feedback` to `/api/generate`; [`buildUserPrompt`](web/src/lib/prompts.ts) appends an instruction block telling the model to produce a meaningfully different output but keep voice/insight intact, and explicitly that platform rules win over feedback if they conflict.

### Originator (`/write`) — Ozzy chat

The originator is a chat-based writing partner named **Ozzy**, modeled loosely on Stanley. Ozzy drafts new LinkedIn posts in the user's voice and revises them across multiple turns. UI is in [web/src/components/Writer.tsx](web/src/components/Writer.tsx). Per-turn flow: user types → `POST /api/draft` with full conversation history → Ozzy returns `{ reply, draft, hook_pattern, notes, exemplars }`. The reply renders as a chat bubble; if `draft` is non-null, a separate draft block renders below the reply with Copy / Show sources / Send to Multiplier actions.

**Structured output via tool-use** ([api/draft/route.ts](web/src/app/api/draft/route.ts)): the model is invoked with `tools: [OZZY_TOOL]` and `tool_choice: { type: "tool", name: "ozzy_reply" }`. This is non-negotiable — early JSON-in-prose mode broke when the model echoed user content containing unescaped quotes. Tool-use guarantees structured output regardless of content.

**Three modes** ([draft-prompts.ts](web/src/lib/draft-prompts.ts) `OzzyMode`):
- `draft` (default) — strong bias toward drafting. Per-turn BM25 retrieval. Empty-state CTA: "Write a new post".
- `brainstorm` — Ozzy does NOT draft. Asks sharp questions, offers angles. Only drafts when user explicitly asks. No retrieval. CTA: "Talk through an idea".
- `analyze` — first turn auto-triggers from CTA "Analyze recent posts". Backend pulls the 10 most recent posts via `getRecentPosts` ([corpus.ts](web/src/lib/corpus.ts)), assembles a trigger prompt, and Ozzy returns an honest editorial audit (what's working, what's becoming a crutch, angles not yet tried). Long-form reply allowed in this mode. Returns 400 with a friendly "ingest first" message if the corpus is empty.

The mode is set client-side from the empty-state CTAs ([Writer.tsx](web/src/components/Writer.tsx) `startMode`) and passed in the request body. It's persistent for the chat session; New Chat resets to `draft`.

**Per-turn retrieval**: the route runs `searchCorpus(latestUserMessage, 5)` every turn and appends exemplars to the latest user message only (older turns keep their original text). This handles mid-chat topic pivots naturally without changing the system prompt (which stays cacheable).

**Conversation history shape sent to the API**: user turns are sent verbatim. Assistant turns are reformatted from the UI's structured state into natural text — the reply, optionally followed by `[draft I produced this turn]` + the draft body. The model reads its own prior drafts as context for revision requests like "shorter" or "lead with the number." Don't send prior assistant turns as JSON — it confuses the model now that tool-use is the output channel.

**Corpus** ([web/src/lib/corpus.ts](web/src/lib/corpus.ts)): inline BM25 over all posts, no embeddings, no vector DB. `loadCorpus()` reads `data/posts.json` once and caches at module scope; missing file → empty corpus (Ozzy still drafts, just without exemplars). Built once from LinkedIn's free data export:
```
cd web && npm run ingest -- /path/to/Shares.csv
```
Ingest script ([web/scripts/ingest-linkedin-export.mjs](web/scripts/ingest-linkedin-export.mjs)) parses `Shares.csv` (tolerates column-name variants), skips empties and reposts, normalizes to `{ id, text, createdAt, url?, reactions?, comments? }`, sorts newest-first.

**Voice rendering**: both `/api/generate` and `/api/draft` share `renderVoiceProfile` from [web/src/lib/voice-renderer.ts](web/src/lib/voice-renderer.ts). Keep in sync when adding voice profile fields.

**Originator → Multiplier handoff**: the "Send to Multiplier" button on a specific draft stores it in `sessionStorage` under [`PENDING_SOURCE_KEY`](web/src/lib/handoff.ts) and navigates to `/`. The Generator picks it up on mount and clears the key. sessionStorage (not localStorage) so the handoff doesn't persist past the tab.

**Corpus file is gitignored** (`web/data/posts.json`) — contains personal post content.

**Worktree gotcha**: `.env.local` isn't git-tracked. If you create a worktree, copy `web/.env.local` from the main repo or the API will return 503.

## Conventions

- Path alias `@/*` → `web/src/*` (see [web/tsconfig.json](web/tsconfig.json)).
- API routes set `export const runtime = "nodejs"` — they use the Anthropic SDK which needs Node, not Edge.
- Anthropic SDK errors are matched by class (`AuthenticationError`, `RateLimitError`, `APIError`) to map to specific HTTP statuses; preserve this pattern when adding new routes.
- Tailwind v4 via PostCSS plugin; dark mode is `dark:` class-based (see existing components for the `bg-zinc-50 dark:bg-black` pattern).
