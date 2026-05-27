"use client";

import { useRouter } from "next/navigation";
import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchProfile,
  VoiceProfile,
} from "@/lib/voice-profile";
import { DEFAULT_MODEL, fetchModel, ModelId, putModel } from "@/lib/model-settings";
import { ModelSelector } from "@/components/ModelSelector";
import { OzzyAvatar } from "@/components/OzzyAvatar";
import { PENDING_SOURCE_KEY } from "@/lib/handoff";
import type { OzzyMode, StoredMessage } from "@/lib/chat-history";
import { findTemplate, type PostTemplate } from "@/lib/templates";
import { TemplatePicker } from "@/components/TemplatePicker";

export interface LoadedChat {
  chatId: string;
  messages: StoredMessage[];
  mode: OzzyMode;
  // Set when the chat was started from a template; null otherwise. The chat
  // detail API returns this and we rehydrate it so the right template prompt
  // is reapplied on every subsequent turn.
  templateId: string | null;
}

interface WriterProps {
  chatId: string;
  loadedChat: LoadedChat | null;
  // True while WriteWorkspace is fetching the selected chat. Lets us render a
  // skeleton instead of the previous chat's messages or the empty-state CTAs.
  loadingChat?: boolean;
  onAfterTurn: () => void;
  onSavedDraftsChanged: () => void;
}

interface Exemplar {
  id: string;
  text: string;
  url: string | null;
  score: number;
}

interface OzzyMeta {
  draft: string | null;
  draft_id: string | null;
  saved: boolean;
  hook_pattern: string | null;
  notes: string | null;
  exemplars: Exemplar[];
}

// imageDataUrl is for inline UI rendering only — never persisted, never sent
// back to the API on subsequent turns (only the current turn's image is sent,
// inside the request's sidecar `image` field).
type ChatMessage =
  | { role: "user"; content: string; imageDataUrl?: string }
  | ({ role: "assistant"; content: string } & OzzyMeta);

interface AttachedImage {
  dataUrl: string; // full data: URL for preview
  base64: string; // payload only, for the API
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

const ALLOWED_IMAGE_MIME = new Set<AttachedImage["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const INTRO_BY_MODE: Record<OzzyMode, string> = {
  draft:
    "I'm Ozzy. Give me a topic, a moment from your week, or a half-baked angle — I'll draft a LinkedIn post in your voice. Tell me what to change and I'll revise.",
  brainstorm:
    "Cool — let's think out loud. Tell me the idea you're chewing on, even if it's vague. I'll help you find the sharp angle before we write anything.",
  analyze:
    "Pulling your recent posts now — I'll tell you what's working, what's getting stale, and where you've got room to swing.",
  template:
    "Picked a template. Tell me the story or the specifics — I'll fill in the [slots] and draft it in your voice.",
};

const ANALYZE_TRIGGER_LABEL = "Analyze my recent posts.";

export function Writer({
  chatId,
  loadedChat,
  loadingChat = false,
  onAfterTurn,
  onSavedDraftsChanged,
}: WriterProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<OzzyMode>("draft");
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Templates are a per-chat choice (you pick one when starting a chat, then
  // every turn in that chat uses it). On rehydration we re-derive from
  // loadedChat.templateId; on a fresh chat the picker sets it.
  const [template, setTemplate] = useState<PostTemplate | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  // Counter so nested dragenter/dragleave on children don't flicker the overlay.
  const dragDepth = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchProfile();
        if (cancelled) return;
        if (!p) {
          router.replace("/onboarding");
          return;
        }
        setProfile(p);
      } catch {
        if (!cancelled) router.replace("/onboarding");
      }
    })();
    fetchModel().then((m) => {
      if (!cancelled) setModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-grow the input textarea with content (capped by CSS max-h-40).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Sync local chat state to the parent-owned chat selection.
  // loadedChat = null means "fresh chat" (sidebar's + New chat); non-null means rehydrate from history.
  // While loadingChat is true, also clear so we don't show the prior chat's
  // bubbles under the skeleton.
  useEffect(() => {
    if (!loadedChat || loadingChat) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting on chat change
      setMessages([]);
      setMode("draft");
      setInput("");
      setError(null);
      setLoading(false);
      setTemplate(null);
      return;
    }
    setTemplate(loadedChat.templateId ? findTemplate(loadedChat.templateId) ?? null : null);
    const rehydrated: ChatMessage[] = loadedChat.messages.map((m) =>
      m.role === "assistant"
        ? {
            role: "assistant",
            content: m.content,
            draft: m.draft,
            draft_id: m.draft_id,
            saved: m.saved,
            hook_pattern: m.hook_pattern,
            notes: m.notes,
            exemplars: m.exemplars ?? [],
          }
        : { role: "user", content: m.content },
    );
    setMessages(rehydrated);
    setMode(loadedChat.mode);
    setInput("");
    setError(null);
    setLoading(false);
  }, [loadedChat, chatId, loadingChat]);

  const handleModelChange = (next: ModelId) => {
    setModel(next);
    void putModel(next);
  };

  const writerName = useMemo(
    () =>
      profile?.identity.display_name?.trim() || profile?.identity.role || "you",
    [profile]
  );

  const canSend =
    profile !== null &&
    !loading &&
    (input.trim().length > 0 || attachedImage !== null);

  const readImageFile = (file: File): Promise<AttachedImage> =>
    new Promise((resolve, reject) => {
      if (!ALLOWED_IMAGE_MIME.has(file.type as AttachedImage["mediaType"])) {
        reject(new Error("Only JPEG, PNG, GIF, or WEBP images are supported."));
        return;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        reject(new Error("Image must be under 5MB."));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the image."));
      reader.onload = () => {
        const dataUrl = String(reader.result ?? "");
        const comma = dataUrl.indexOf(",");
        if (comma < 0) {
          reject(new Error("Could not read the image."));
          return;
        }
        resolve({
          dataUrl,
          base64: dataUrl.slice(comma + 1),
          mediaType: file.type as AttachedImage["mediaType"],
        });
      };
      reader.readAsDataURL(file);
    });

  const acceptDroppedFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const image = Array.from(files).find((f) => f.type.startsWith("image/"));
    if (!image) {
      setError("Drop an image file (JPEG, PNG, GIF, or WEBP).");
      return;
    }
    try {
      const attached = await readImageFile(image);
      setAttachedImage(attached);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not attach image.");
    }
  };

  const onChatDragEnter = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
    e.preventDefault();
    dragDepth.current += 1;
    setIsDragging(true);
  };
  const onChatDragOver = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };
  const onChatDragLeave = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragging(false);
  };
  const onChatDrop = (e: React.DragEvent) => {
    if (!Array.from(e.dataTransfer?.types ?? []).includes("Files")) return;
    e.preventDefault();
    dragDepth.current = 0;
    setIsDragging(false);
    void acceptDroppedFiles(e.dataTransfer?.files ?? null);
  };

  // Core send — uses a passed-in mode so CTA-triggered sends don't race with React state updates.
  const sendMessage = async (userText: string, sendMode: OzzyMode) => {
    if (!profile) return;
    // Snapshot the attachment before we clear it so the in-flight request and
    // the rendered user bubble both see the same image.
    const pendingImage = attachedImage;
    // Image-only sends still need *some* text so the API contract holds
    // (content.length > 0) and so the model has a textual prompt to react to.
    const effectiveText =
      userText.trim().length > 0
        ? userText
        : "Use this image as inspiration for a post in my voice.";
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        role: "user",
        content: effectiveText,
        imageDataUrl: pendingImage?.dataUrl,
      },
    ];
    setMessages(nextMessages);
    setInput("");
    setAttachedImage(null);
    setLoading(true);
    setError(null);

    const apiMessages = nextMessages.map((m) => {
      if (m.role === "assistant") {
        const parts = [m.content];
        if (m.draft) {
          parts.push("");
          parts.push("[draft I produced this turn]");
          parts.push(m.draft);
        }
        return {
          role: "assistant" as const,
          content: parts.join("\n"),
        };
      }
      return { role: "user" as const, content: m.content };
    });

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          profile,
          model,
          // If a template is active for this chat, every turn runs in template
          // mode regardless of the caller-passed sendMode. This handles
          // CTA-triggered sends from any flow.
          mode: template ? "template" : sendMode,
          templateId: template?.id,
          chatId,
          userMessageId: crypto.randomUUID(),
          image: pendingImage
            ? { media_type: pendingImage.mediaType, data: pendingImage.base64 }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          draft: data.draft ?? null,
          draft_id: data.draft_id ?? null,
          saved: false,
          hook_pattern: data.hook_pattern ?? null,
          notes: data.notes ?? null,
          exemplars: data.exemplars ?? [],
        },
      ]);
      onAfterTurn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    if (!canSend) return;
    sendMessage(input.trim(), mode);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const retryLast = () => {
    if (messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last.role !== "user") return;
    setMessages(messages.slice(0, -1));
    setInput(last.content);
    setError(null);
  };

  // Toggle starred state on a draft. Optimistic — flip locally first, revert
  // on server error. Notifies parent so the sidebar's saved-drafts list refreshes.
  const toggleSavedDraft = async (draftId: string, nextSaved: boolean) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "assistant" && m.draft_id === draftId
          ? { ...m, saved: nextSaved }
          : m,
      ),
    );
    try {
      const res = await fetch(`/api/drafts/${draftId}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: nextSaved }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onSavedDraftsChanged();
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.draft_id === draftId
            ? { ...m, saved: !nextSaved }
            : m,
        ),
      );
    }
  };

  const sendDraftToMultiplier = (draft: string) => {
    try {
      window.sessionStorage.setItem(PENDING_SOURCE_KEY, draft);
    } catch {
      // ignore quota errors
    }
    router.push("/");
  };

  const startMode = (next: OzzyMode) => {
    setMode(next);
    if (next === "analyze") {
      // Auto-fire the analyze flow — the API assembles the real trigger from
      // the corpus when mode=analyze and messages.length===1.
      sendMessage(ANALYZE_TRIGGER_LABEL, "analyze");
      return;
    }
    // For draft/brainstorm just focus the input — user types from here.
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div
      className="relative flex flex-col h-[calc(100vh-12rem)] min-h-[32rem]"
      onDragEnter={onChatDragEnter}
      onDragOver={onChatDragOver}
      onDragLeave={onChatDragLeave}
      onDrop={onChatDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-zinc-400 dark:border-zinc-500 bg-white/80 dark:bg-black/80 pointer-events-none">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">
            Drop an image for Ozzy to read
          </div>
        </div>
      )}
      <header className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5 min-w-0">
          <OzzyAvatar size={40} speaking={loading} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium">
              Ozzy
              {mode !== "draft" && (
                <span className="ml-2 text-[11px] font-normal text-zinc-400">
                  · {mode} mode
                </span>
              )}
            </span>
            <span className="text-[11px] text-zinc-400 truncate">
              writing partner for {writerName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-zinc-400 shrink-0">
          <ModelSelector value={model} onChange={handleModelChange} />
        </div>
      </header>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto py-4 space-y-4 px-1"
      >
        {loadingChat ? (
          <ChatLoadingSkeleton />
        ) : (
          <>
            <AssistantBubble
              content={INTRO_BY_MODE[mode]}
              draft={null}
              draftId={null}
              saved={false}
              hookPattern={null}
              notes={null}
              exemplars={[]}
              onSendDraft={sendDraftToMultiplier}
              onToggleSave={toggleSavedDraft}
            />
            {messages.length === 0 && !loading && (
              <div className="pl-9 flex flex-wrap gap-2 pt-1">
                <CtaChip
                  label="Write a new post"
                  icon="✎"
                  onClick={() => startMode("draft")}
                  active={mode === "draft"}
                />
                <CtaChip
                  label="Talk through an idea"
                  icon="💭"
                  onClick={() => startMode("brainstorm")}
                  active={mode === "brainstorm"}
                />
                <CtaChip
                  label="Analyze recent posts"
                  icon="📊"
                  onClick={() => startMode("analyze")}
                  active={mode === "analyze"}
                />
                <CtaChip
                  label="Try a template"
                  icon="🧩"
                  onClick={() => setPickerOpen(true)}
                  active={template !== null}
                />
              </div>
            )}
          </>
        )}
        {!loadingChat && messages.map((m, i) =>
          m.role === "user" ? (
            <UserBubble
              key={i}
              content={m.content}
              imageDataUrl={m.imageDataUrl}
            />
          ) : (
            <AssistantBubble
              key={i}
              content={m.content}
              draft={m.draft}
              draftId={m.draft_id}
              saved={m.saved}
              hookPattern={m.hook_pattern}
              notes={m.notes}
              exemplars={m.exemplars}
              onSendDraft={sendDraftToMultiplier}
              onToggleSave={toggleSavedDraft}
            />
          )
        )}
        {loading && (
          <div className="flex items-start gap-2">
            <OzzyAvatar size={28} speaking />
            <div className="text-xs text-zinc-400 mt-2 animate-pulse">
              Ozzy is{" "}
              {mode === "analyze"
                ? "reading your posts"
                : mode === "brainstorm"
                  ? "thinking"
                  : "drafting"}
              …
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
            <span>{error}</span>
            <button
              onClick={retryLast}
              className="font-medium hover:underline shrink-0"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3">
        {template && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1.5">
            <span className="text-xs text-indigo-700 dark:text-indigo-300">
              <span className="font-medium">Template:</span> {template.name}
            </span>
            <button
              onClick={() => setTemplate(null)}
              disabled={messages.length > 0}
              title={
                messages.length > 0
                  ? "Start a new chat to drop this template"
                  : "Remove template"
              }
              className="text-indigo-400 hover:text-rose-500 text-base leading-none px-1 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Remove template"
            >
              ×
            </button>
          </div>
        )}
        {attachedImage && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote asset */}
            <img
              src={attachedImage.dataUrl}
              alt="Attached"
              className="h-10 w-10 rounded object-cover"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Image attached
            </span>
            <button
              onClick={() => setAttachedImage(null)}
              className="text-zinc-400 hover:text-rose-500 text-base leading-none px-1"
              aria-label="Remove attached image"
            >
              ×
            </button>
          </div>
        )}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-end gap-2 px-3 py-2 focus-within:border-zinc-400 dark:focus-within:border-zinc-600 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={
              messages.length === 0
                ? mode === "brainstorm"
                  ? "What's the idea you're chewing on?"
                  : "Tell Ozzy what to write about…"
                : "Type a reply… (Shift+Enter for newline)"
            }
            rows={1}
            className="flex-1 bg-transparent text-sm focus:outline-none resize-none max-h-40 leading-relaxed overflow-y-auto"
          />
          <button
            onClick={send}
            disabled={!canSend || loadingChat}
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-3 py-1 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </div>
        <p className="text-[10px] text-zinc-400 mt-1.5 px-1">
          Rate-limited to 6 turns per IP per 30 seconds.
        </p>
      </div>
      <TemplatePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(t) => {
          setTemplate(t);
          setMode("template");
          // Focus the input so the user can immediately tell Ozzy their angle.
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      />
    </div>
  );
}

function ChatLoadingSkeleton() {
  // Three shimmering bubbles that roughly mimic the layout of an assistant
  // turn, a user turn, and a longer assistant turn. Hides the prior chat's
  // content while the new one is in flight without dropping a blank canvas.
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-start gap-2">
        <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-1.5 max-w-md">
          <div className="h-3 w-3/4 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-1/2 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-8 w-48 rounded-2xl rounded-br-md bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="flex items-start gap-2">
        <div className="h-7 w-7 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
        <div className="flex-1 space-y-1.5 max-w-md">
          <div className="h-3 w-5/6 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-4/6 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-3 w-3/6 rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
    </div>
  );
}

function CtaChip({
  label,
  icon,
  onClick,
  active,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600"
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function UserBubble({
  content,
  imageDataUrl,
}: {
  content: string;
  imageDataUrl?: string;
}) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-md bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-3 py-2 text-sm whitespace-pre-wrap space-y-2">
        {imageDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, not a remote asset
          <img
            src={imageDataUrl}
            alt="Attached"
            className="max-h-64 rounded-lg object-cover"
          />
        )}
        {content && <div>{content}</div>}
      </div>
    </div>
  );
}

function AssistantBubble({
  content,
  draft,
  draftId,
  saved,
  hookPattern,
  notes,
  exemplars,
  onSendDraft,
  onToggleSave,
}: {
  content: string;
  draft: string | null;
  draftId: string | null;
  saved: boolean;
  hookPattern: string | null;
  notes: string | null;
  exemplars: Exemplar[];
  onSendDraft: (draft: string) => void;
  onToggleSave: (draftId: string, nextSaved: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <OzzyAvatar size={28} />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="max-w-md text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-snug">
          {content}
        </div>
        {draft && (
          <DraftBlock
            draft={draft}
            draftId={draftId}
            saved={saved}
            hookPattern={hookPattern}
            notes={notes}
            exemplars={exemplars}
            onSendDraft={onSendDraft}
            onToggleSave={onToggleSave}
          />
        )}
      </div>
    </div>
  );
}

function DraftBlock({
  draft,
  draftId,
  saved,
  hookPattern,
  notes,
  exemplars,
  onSendDraft,
  onToggleSave,
}: {
  draft: string;
  draftId: string | null;
  saved: boolean;
  hookPattern: string | null;
  notes: string | null;
  exemplars: Exemplar[];
  onSendDraft: (draft: string) => void;
  onToggleSave: (draftId: string, nextSaved: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [exemplarsOpen, setExemplarsOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-md rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="px-3 py-2 text-[11px] text-zinc-400 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-2">
        <span>LinkedIn draft</span>
        <div className="flex items-center gap-3">
          {hookPattern && <span>hook: {hookPattern}</span>}
          <button
            onClick={() => draftId && onToggleSave(draftId, !saved)}
            disabled={!draftId}
            title={saved ? "Unstar" : "Save to drafts"}
            aria-label={saved ? "Unstar draft" : "Save draft"}
            aria-pressed={saved}
            className={`text-base leading-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              saved
                ? "text-amber-500 hover:text-amber-600"
                : "text-zinc-300 hover:text-amber-500 dark:text-zinc-600 dark:hover:text-amber-400"
            }`}
          >
            {saved ? "★" : "☆"}
          </button>
        </div>
      </div>
      <div className="px-3 py-3 text-[13px] leading-snug whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
        {notes && (
          <div className="mb-3 text-zinc-500 dark:text-zinc-400 text-[11px] italic border-l-2 border-zinc-300 dark:border-zinc-700 pl-2">
            {notes}
          </div>
        )}
        {draft}
      </div>
      <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center gap-3 text-xs">
        <button
          onClick={copy}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        {exemplars.length > 0 && (
          <button
            onClick={() => setExemplarsOpen((v) => !v)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            {exemplarsOpen ? "Hide" : "Show"} sources ({exemplars.length})
          </button>
        )}
        <button
          onClick={() => onSendDraft(draft)}
          className="ml-auto text-zinc-700 dark:text-zinc-200 font-medium hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Send to Multiply →
        </button>
      </div>
      {exemplarsOpen && exemplars.length > 0 && (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-900 border-t border-zinc-100 dark:border-zinc-900">
          {exemplars.map((ex) => (
            <li key={ex.id} className="px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-1 text-[11px] text-zinc-400">
                <span>score {ex.score}</span>
                {ex.url && (
                  <a
                    href={ex.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    Open on LinkedIn ↗
                  </a>
                )}
              </div>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap line-clamp-4">
                {ex.text}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
