import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildAnalyzeTrigger,
  buildOzzySystem,
  buildOzzyUserTurn,
  ChatMessage,
  OzzyMode,
} from "@/lib/draft-prompts";
import { VoiceProfile } from "@/lib/voice-profile";
import { isValidModel, ModelId } from "@/lib/model-settings";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getRecentUserPosts, searchUserCorpus, ScoredPost } from "@/lib/corpus";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { logDraftReturningId } from "@/lib/drafts-log";
import {
  deriveChatTitle,
  isUuid,
  logChatTurn,
  upsertChat,
  type StoredExemplar,
} from "@/lib/chat-history";
import { findTemplate, PostTemplate } from "@/lib/templates";

export const runtime = "nodejs";

// Sidecar image attached to the latest user turn. Not persisted — disappears
// on rehydration. Only the latest turn carries it; older turns in the history
// were already sent without images, so the model never re-sees them.
interface DraftImage {
  media_type: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
  // Base64 payload only (no data: URL prefix).
  data: string;
}

interface DraftRequest {
  messages: ChatMessage[];
  profile: VoiceProfile;
  model?: ModelId;
  mode?: OzzyMode;
  chatId?: string;
  userMessageId?: string;
  image?: DraftImage;
  // Only meaningful when mode === 'template'. Plain string key from
  // web/src/lib/templates.ts — validated server-side. Snapshot per-chat on
  // first turn, then read back from the chat row on later turns.
  templateId?: string;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// Anthropic limit is 5MB per image. Base64 is ~4/3 the byte size; cap the
// encoded length so we reject early without decoding.
const MAX_IMAGE_BASE64_LEN = Math.ceil((5 * 1024 * 1024 * 4) / 3);

function isValidImage(value: unknown): value is DraftImage {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (typeof v.media_type !== "string" || !ALLOWED_IMAGE_TYPES.has(v.media_type)) {
    return false;
  }
  if (typeof v.data !== "string" || v.data.length === 0) return false;
  if (v.data.length > MAX_IMAGE_BASE64_LEN) return false;
  return true;
}

function isValidMode(v: unknown): v is OzzyMode {
  return (
    v === "draft" || v === "brainstorm" || v === "analyze" || v === "template"
  );
}

interface OzzyReply {
  reply: string;
  draft: string | null;
  hook_pattern: string | null;
  notes: string | null;
}

const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";

const OZZY_TOOL: Anthropic.Tool = {
  name: "ozzy_reply",
  description:
    "Send your turn back to the user. Always use this tool — never plain text.",
  input_schema: {
    type: "object",
    properties: {
      reply: {
        type: "string",
        description:
          "1-3 sentence chat bubble message. Never the post body — the post goes in 'draft'.",
      },
      draft: {
        type: ["string", "null"],
        description:
          "The LinkedIn post body, ready to paste. Null when you're chatting or asking instead of drafting.",
      },
      hook_pattern: {
        type: ["string", "null"],
        description:
          "When draft is non-null, which signature move you used for the opener (e.g. 'setup_then_flip'). Null otherwise.",
      },
      notes: {
        type: ["string", "null"],
        description:
          "Optional one-sentence note about a deliberate choice. Null when nothing notable.",
      },
    },
    required: ["reply", "draft", "hook_pattern", "notes"],
  },
};

function isValidMessages(value: unknown): value is ChatMessage[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  for (const m of value) {
    if (!m || typeof m !== "object") return false;
    const mm = m as Record<string, unknown>;
    if (mm.role !== "user" && mm.role !== "assistant") return false;
    if (typeof mm.content !== "string" || mm.content.length === 0) return false;
  }
  // First message must be user; last message must be user (we're responding to it)
  const first = value[0] as ChatMessage;
  const last = value[value.length - 1] as ChatMessage;
  if (first.role !== "user") return false;
  if (last.role !== "user") return false;
  return true;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to web/.env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  // Defense-in-depth: middleware already gates this route, but we re-verify
  // here in case middleware is bypassed (Supabase docs explicitly recommend
  // this pattern — never trust middleware alone for authorization).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(ip, user.id);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached. Try again in ${rateLimit.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let body: DraftRequest;
  try {
    body = (await request.json()) as DraftRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const { messages, profile, model: requestedModel, mode: requestedMode } = body;
  const model: ModelId = isValidModel(requestedModel)
    ? requestedModel
    : DEFAULT_MODEL;
  const mode: OzzyMode = isValidMode(requestedMode) ? requestedMode : "draft";

  // Persistence is opt-in by the client passing valid uuids. Older clients
  // omit them and continue to work in-memory only.
  const persist =
    isUuid(body.chatId) && isUuid(body.userMessageId)
      ? { chatId: body.chatId, userMessageId: body.userMessageId }
      : null;

  if (!isValidMessages(messages)) {
    return NextResponse.json(
      {
        error:
          "messages must be a non-empty array starting and ending with role=user; each item needs { role, content }",
      },
      { status: 400 }
    );
  }
  const image: DraftImage | null =
    body.image !== undefined ? (isValidImage(body.image) ? body.image : null) : null;
  if (body.image !== undefined && image === null) {
    return NextResponse.json(
      {
        error:
          "image must be { media_type: jpeg|png|gif|webp, data: base64 string ≤5MB }",
      },
      { status: 400 }
    );
  }
  if (!profile || typeof profile !== "object") {
    return NextResponse.json(
      { error: "Voice profile is required" },
      { status: 400 }
    );
  }

  // Template mode requires a known template id. Reject unknown ids early so
  // we don't silently degrade to plain draft mode (which would confuse the
  // user — they picked a template for a reason).
  let template: PostTemplate | null = null;
  if (mode === "template") {
    if (typeof body.templateId !== "string") {
      return NextResponse.json(
        { error: "Template mode requires templateId" },
        { status: 400 }
      );
    }
    const found = findTemplate(body.templateId);
    if (!found) {
      return NextResponse.json(
        { error: `Unknown template: ${body.templateId}` },
        { status: 400 }
      );
    }
    template = found;
  }

  const latestUser = messages[messages.length - 1];

  let exemplars: ScoredPost[] = [];
  let augmentedLatestUser: string = latestUser.content;
  let analyzeError: string | null = null;

  if (mode === "analyze" && messages.length === 1) {
    // First turn of analyze mode: pull recent posts from the corpus and build
    // the trigger prompt. If the corpus is empty, return a friendly error so
    // the UI can tell the user to ingest first.
    try {
      const recent = await getRecentUserPosts(supabase, user.id, 10);
      if (recent.length === 0) {
        analyzeError =
          "No posts in your corpus yet. Upload your LinkedIn Shares.csv from Settings, then try Analyze again.";
      } else {
        augmentedLatestUser = buildAnalyzeTrigger(recent);
      }
    } catch (e) {
      return NextResponse.json(
        {
          error: `Failed to load corpus: ${e instanceof Error ? e.message : "unknown"}`,
        },
        { status: 500 }
      );
    }
  } else if (mode === "draft") {
    // Per-turn BM25 retrieval. Skipped for brainstorm/analyze where exemplars
    // would muddy the conversation.
    try {
      exemplars = await searchUserCorpus(supabase, user.id, latestUser.content, 5);
      augmentedLatestUser = buildOzzyUserTurn(latestUser.content, exemplars);
    } catch (e) {
      return NextResponse.json(
        {
          error: `Failed to load corpus: ${e instanceof Error ? e.message : "unknown"}`,
        },
        { status: 500 }
      );
    }
  }

  if (analyzeError) {
    return NextResponse.json({ error: analyzeError }, { status: 400 });
  }

  // Persist the chat row + user turn before the model call so an Anthropic
  // failure still leaves a coherent transcript. Fire-and-forget — the
  // user-facing response never waits on these.
  if (persist) {
    upsertChat({
      supabase,
      id: persist.chatId,
      userId: user.id,
      title:
        template !== null
          ? `[${template.name}] ${deriveChatTitle(latestUser.content)}`
          : deriveChatTitle(latestUser.content),
      mode,
      templateId: template?.id ?? null,
    });
    logChatTurn({
      supabase,
      id: persist.userMessageId,
      chatId: persist.chatId,
      userId: user.id,
      role: "user",
      content: latestUser.content,
      modeAtTurn: mode,
    });
  }

  // Build the API messages: pass conversation history verbatim, but augment
  // ONLY the latest user message (with retrieved exemplars in draft mode, or
  // the assembled analyze trigger in analyze mode). If an inspiration image
  // is attached, the latest turn becomes a content-block array with the image
  // first so the model sees it before reading the user's text.
  const apiMessages: Anthropic.MessageParam[] = messages.map((m, i) => {
    if (i === messages.length - 1 && m.role === "user") {
      if (image) {
        return {
          role: "user" as const,
          content: [
            {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: image.media_type,
                data: image.data,
              },
            },
            { type: "text" as const, text: augmentedLatestUser },
          ],
        };
      }
      return { role: "user" as const, content: augmentedLatestUser };
    }
    return { role: m.role, content: m.content };
  });

  const client = new Anthropic();
  const systemPrompt = buildOzzySystem(profile, mode, template);

  // TEMP DEBUG — confirm the voice constraints actually reach the model.
  // Logs the saved punctuation enums and the PUNCTUATION RULES block from the
  // rendered system prompt. Gated on DEBUG_OZZY_PROMPT=1.
  if (process.env.DEBUG_OZZY_PROMPT === "1") {
    const punctIdx = systemPrompt.indexOf("PUNCTUATION RULES");
    const punctSlice =
      punctIdx >= 0
        ? systemPrompt.slice(punctIdx, punctIdx + 400)
        : "(PUNCTUATION RULES block not found in system prompt)";
    console.log("[ozzy-debug] profile.punctuation =", profile.punctuation);
    console.log("[ozzy-debug] rendered punctuation block:\n" + punctSlice);
  }

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: apiMessages,
      tools: [OZZY_TOOL],
      tool_choice: { type: "tool", name: "ozzy_reply" },
    });

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock =>
        b.type === "tool_use" && b.name === "ozzy_reply"
    );
    if (!toolUse) {
      return NextResponse.json(
        { error: "Model did not call ozzy_reply tool" },
        { status: 502 }
      );
    }

    const parsed = toolUse.input as OzzyReply;
    if (typeof parsed.reply !== "string" || parsed.reply.length === 0) {
      return NextResponse.json(
        { error: "Model output missing required field 'reply'", got: parsed },
        { status: 502 }
      );
    }

    const draftText =
      typeof parsed.draft === "string" && parsed.draft.length > 0
        ? parsed.draft
        : null;

    // TEMP DEBUG — flag forbidden chars in the returned draft so we can
    // correlate "what the prompt said" with "what the model returned".
    if (process.env.DEBUG_OZZY_PROMPT === "1" && draftText) {
      const violations: string[] = [];
      if (profile.punctuation.em_dash === "forbidden" && /[—–]|--/.test(draftText)) {
        violations.push("em/en dash or double-hyphen");
      }
      if (profile.punctuation.exclamation === "forbidden" && /!/.test(draftText)) {
        violations.push("exclamation");
      }
      if (profile.punctuation.ellipsis === "forbidden" && /\.\.\.|…/.test(draftText)) {
        violations.push("ellipsis");
      }
      console.log("[ozzy-debug] draft length =", draftText.length);
      console.log(
        "[ozzy-debug] forbidden-char violations =",
        violations.length > 0 ? violations.join(", ") : "(none)",
      );
      console.log("[ozzy-debug] draft preview:\n" + draftText.slice(0, 500));
    }

    // Await the insert so we can return draft_id to the client (used by the
    // star/save button). Failure returns null and we proceed — saving is
    // non-critical and shouldn't break the chat reply.
    let draftId: string | null = null;
    if (draftText) {
      draftId = await logDraftReturningId({
        supabase,
        userId: user.id,
        kind: "originator",
        output: draftText,
        hook_pattern: parsed.hook_pattern ?? null,
        model,
      });
    }

    const trimmedExemplars: StoredExemplar[] = exemplars.map((e) => ({
      id: e.id,
      text: e.text,
      url: e.url ?? null,
      score: Number(e.score.toFixed(3)),
    }));

    if (persist) {
      logChatTurn({
        supabase,
        id: crypto.randomUUID(),
        chatId: persist.chatId,
        userId: user.id,
        role: "assistant",
        content: parsed.reply,
        modeAtTurn: mode,
        draft: draftText,
        hookPattern: parsed.hook_pattern ?? null,
        notes: parsed.notes ?? null,
        exemplars: trimmedExemplars.length > 0 ? trimmedExemplars : null,
        draftId,
      });
    }

    return NextResponse.json({
      reply: parsed.reply,
      draft: draftText,
      draft_id: draftId,
      hook_pattern: parsed.hook_pattern ?? null,
      notes: parsed.notes ?? null,
      exemplars: trimmedExemplars,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens:
          response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "Invalid ANTHROPIC_API_KEY" },
        { status: 401 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited by Anthropic. Try again in a moment." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Anthropic API error (${error.status}): ${error.message}` },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
