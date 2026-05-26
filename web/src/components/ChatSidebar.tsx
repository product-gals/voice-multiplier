"use client";

import { useCallback, useEffect, useState } from "react";
import type { ChatSummary } from "@/lib/chat-history";

interface ChatSidebarProps {
  currentChatId: string;
  refreshKey: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleted: (id: string) => void;
}

export function ChatSidebar({
  currentChatId,
  refreshKey,
  onSelect,
  onNew,
  onDeleted,
}: ChatSidebarProps) {
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [authed, setAuthed] = useState(true);

  const load = useCallback(async () => {
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching remote chat list
    load();
  }, [load, refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Delete this chat? This can't be undone.")) return;
    // Optimistic remove
    setChats((prev) => prev?.filter((c) => c.id !== id) ?? null);
    try {
      await fetch(`/api/chats/${id}`, { method: "DELETE" });
    } catch {
      // Reload to reconcile if the delete failed
      load();
    }
    onDeleted(id);
  };

  if (!authed) return null;

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-200 dark:border-zinc-800 flex flex-col h-[calc(100vh-5rem)]">
      <div className="px-3 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onNew}
          className="w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors"
        >
          + New chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {chats === null && (
          <p className="px-3 py-2 text-[11px] text-zinc-400">Loading…</p>
        )}
        {chats !== null && chats.length === 0 && (
          <p className="px-3 py-2 text-[11px] text-zinc-400">
            No chats yet. Start one to save it here.
          </p>
        )}
        {chats?.map((c) => {
          const active = c.id === currentChatId;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`group w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                active
                  ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
              }`}
            >
              <span className="flex-1 min-w-0 truncate">{c.title}</span>
              {c.mode !== "draft" && (
                <span className="text-[10px] text-zinc-400 shrink-0">
                  {c.mode}
                </span>
              )}
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleDelete(e, c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleDelete(e as unknown as React.MouseEvent, c.id);
                  }
                }}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-zinc-400 hover:text-rose-500 shrink-0 px-1"
                aria-label="Delete chat"
              >
                ×
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
