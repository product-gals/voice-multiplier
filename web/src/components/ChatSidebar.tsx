"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatSummary } from "@/lib/chat-history";
import { PENDING_SOURCE_KEY } from "@/lib/handoff";

interface ChatSidebarProps {
  currentChatId: string;
  refreshKey: number;
  savedDraftsRefreshKey: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}

interface SavedDraft {
  id: string;
  output: string;
  hook_pattern: string | null;
  saved_at: string;
  created_at: string;
}

export function ChatSidebar({
  currentChatId,
  refreshKey,
  savedDraftsRefreshKey,
  onSelect,
  onNew,
  onDeleted,
}: ChatSidebarProps) {
  const router = useRouter();
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[] | null>(null);
  const [authed, setAuthed] = useState(true);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chats");
      if (res.status === 401) {
        setAuthed(false);
        setChats([]);
        return;
      }
      if (!res.ok) {
        setChats([]);
        return;
      }
      const data = (await res.json()) as { chats: ChatSummary[] };
      setAuthed(true);
      setChats(data.chats);
    } catch {
      setChats([]);
    }
  }, []);

  const loadSavedDrafts = useCallback(async () => {
    try {
      const res = await fetch("/api/drafts/saved");
      if (!res.ok) {
        setSavedDrafts([]);
        return;
      }
      const data = (await res.json()) as { drafts: SavedDraft[] };
      setSavedDrafts(data.drafts);
    } catch {
      setSavedDrafts([]);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching remote chat list
    loadChats();
  }, [loadChats, refreshKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching saved drafts
    loadSavedDrafts();
  }, [loadSavedDrafts, savedDraftsRefreshKey]);

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat? This can't be undone.")) return;
    setChats((prev) => prev?.filter((c) => c.id !== id) ?? null);
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
    } catch {
      loadChats();
    }
    onDeleted(id);
  };

  const handleUnsaveDraft = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Optimistic remove from list.
    setSavedDrafts((prev) => prev?.filter((d) => d.id !== id) ?? null);
    try {
      const res = await fetch(`/api/drafts/${id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: false }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch {
      // Reload to reconcile if unsave failed
      loadSavedDrafts();
    }
  };

  const handleSendToMultiplier = (output: string) => {
    try {
      window.sessionStorage.setItem(PENDING_SOURCE_KEY, output);
    } catch {
      // ignore quota errors
    }
    router.push("/");
  };

  if (!authed) return null;

  return (
    <aside className="w-72 shrink-0 flex flex-col h-[calc(100vh-8rem)] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onNew}
          className="w-full rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-50 dark:text-zinc-900 hover:opacity-90 transition-opacity"
        >
          + New chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide font-medium text-zinc-400">
          Recent chats
        </div>
        <div className="pb-2">
          {chats === null && (
            <p className="px-3 py-2 text-xs text-zinc-400">Loading…</p>
          )}
          {chats !== null && chats.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-400 leading-relaxed">
              No chats yet. Start one to save it here.
            </p>
          )}
          {chats?.map((c) => {
            const active = c.id === currentChatId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  active
                    ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 border-l-2 border-zinc-900 dark:border-zinc-100"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-l-2 border-transparent"
                }`}
              >
                <span className="flex-1 min-w-0 truncate">{c.title}</span>
                {c.mode !== "draft" && (
                  <span className="text-[10px] uppercase tracking-wide text-zinc-400 shrink-0">
                    {c.mode}
                  </span>
                )}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleDeleteChat(e, c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleDeleteChat(e as unknown as React.MouseEvent, c.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-rose-500 shrink-0 px-1 text-base leading-none"
                  aria-label="Delete chat"
                >
                  ×
                </span>
              </button>
            );
          })}
        </div>

        <div className="px-3 pt-3 pb-1 text-[11px] uppercase tracking-wide font-medium text-zinc-400 border-t border-zinc-100 dark:border-zinc-900 mt-1">
          Saved drafts
        </div>
        <div className="pb-3">
          {savedDrafts === null && (
            <p className="px-3 py-2 text-xs text-zinc-400">Loading…</p>
          )}
          {savedDrafts !== null && savedDrafts.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-400 leading-relaxed">
              Star any draft Ozzy writes to save it for later.
            </p>
          )}
          {savedDrafts?.map((d) => (
            <button
              key={d.id}
              onClick={() => handleSendToMultiplier(d.output)}
              title="Send to Multiply"
              className="group w-full text-left px-3 py-2 text-xs flex items-start gap-2 transition-colors text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 border-l-2 border-transparent"
            >
              <span className="text-amber-500 shrink-0 leading-snug">★</span>
              <span className="flex-1 min-w-0 leading-snug line-clamp-2">
                {d.output}
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleUnsaveDraft(e, d.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleUnsaveDraft(e as unknown as React.MouseEvent, d.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-rose-500 shrink-0 px-1 text-base leading-none"
                aria-label="Unstar draft"
              >
                ×
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
