"use client";

import { useCallback, useState } from "react";
import { ChatSidebar } from "@/components/ChatSidebar";
import { Writer, type LoadedChat } from "@/components/Writer";
import type { OzzyMode, StoredMessage } from "@/lib/chat-history";

interface ChatPayload {
  chat: { id: string; mode: OzzyMode };
  messages: StoredMessage[];
}

export function WriteWorkspace() {
  const [chatId, setChatId] = useState<string>(() => crypto.randomUUID());
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [loadedChat, setLoadedChat] = useState<LoadedChat | null>(null);

  const handleNew = useCallback(() => {
    setChatId(crypto.randomUUID());
    setLoadedChat(null);
  }, []);

  const handleSelect = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as ChatPayload;
      setChatId(id);
      setLoadedChat({
        chatId: id,
        messages: data.messages,
        mode: data.chat.mode,
      });
    } catch {
      // ignore; sidebar will surface stale entry until next refresh
    }
  }, []);

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
          onSelect={handleSelect}
          onNew={handleNew}
          onDeleted={handleDeleted}
        />
      </div>
      <div className="flex-1 min-w-0">
        <Writer
          chatId={chatId}
          loadedChat={loadedChat}
          onAfterTurn={handleAfterTurn}
          onNewChat={handleNew}
        />
      </div>
    </div>
  );
}
