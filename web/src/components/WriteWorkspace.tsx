"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Writer, type LoadedChat } from "@/components/Writer";
import type { OzzyMode, StoredMessage } from "@/lib/chat-history";

interface ChatPayload {
  chat: { id: string; mode: OzzyMode; template_id: string | null };
  messages: StoredMessage[];
}

export function WriteWorkspace() {
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID());
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [savedDraftsRefreshKey, setSavedDraftsRefreshKey] = useState(0);
  const [loadedChat, setLoadedChat] = useState<LoadedChat | null>(null);
  const [loadingChatId, setLoadingChatId] = useState<string | null>(null);
  // Ref tracks the currently-selected chat so an in-flight fetch can detect
  // that the user moved on before its response landed.
  const currentChatIdRef = useRef(chatId);
  useEffect(() => {
    currentChatIdRef.current = chatId;
  }, [chatId]);

  const handleNew = useCallback(() => {
    setChatId(crypto.randomUUID());
    setLoadedChat(null);
    setLoadingChatId(null);
  }, []);

  const handleSavedDraftsChanged = useCallback(() => {
    setSavedDraftsRefreshKey((k) => k + 1);
  }, []);

  const handleSelect = useCallback(
    async (id: string) => {
      // Skip the round-trip if the chat is already loaded and showing.
      if (id === chatId && loadedChat?.chatId === id) return;
      // Flip the sidebar highlight + show the loading skeleton immediately,
      // before the fetch returns. Big perceived-latency win.
      setChatId(id);
      setLoadingChatId(id);
      try {
        const res = await fetch(`/api/chats/${id}`);
        if (!res.ok) {
          if (currentChatIdRef.current === id) setLoadingChatId(null);
          return;
        }
        const data = (await res.json()) as ChatPayload;
        // Stale-response guard: if the user clicked away mid-fetch, drop this
        // result on the floor — the newer click owns the UI now.
        if (currentChatIdRef.current !== id) return;
        setLoadedChat({
          chatId: id,
          messages: data.messages,
          mode: data.chat.mode,
          templateId: data.chat.template_id,
        });
        setLoadingChatId(null);
      } catch {
        if (currentChatIdRef.current === id) setLoadingChatId(null);
      }
    },
    [chatId, loadedChat],
  );

  const handleAfterTurn = useCallback(() => {
    setSidebarRefreshKey((k) => k + 1);
  }, []);

  const handleDeleted = useCallback(
    (deletedId: string) => {
      if (deletedId === chatId) {
        handleNew();
      }
    },
    [chatId, handleNew],
  );

  return (
    <div className="flex gap-6">
      <div className="hidden md:block">
        <ChatSidebar
          currentChatId={chatId}
          refreshKey={sidebarRefreshKey}
          savedDraftsRefreshKey={savedDraftsRefreshKey}
          onSelect={handleSelect}
          onNew={handleNew}
          onDeleted={handleDeleted}
        />
      </div>
      <div className="flex-1 min-w-0">
        <Writer
          chatId={chatId}
          loadedChat={loadedChat}
          loadingChat={loadingChatId === chatId}
          onAfterTurn={handleAfterTurn}
          onSavedDraftsChanged={handleSavedDraftsChanged}
        />
      </div>
    </div>
  );
}
