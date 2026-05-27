import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { deriveChatTitle, isUuid } from "@/lib/chat-history";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/drafts/:id/open-chat — resolves a saved draft to a chat the user
// can keep working in.
//
// If the draft was produced inside a chat (chat_messages.draft_id back-ref),
// return that chat's id so the client can rehydrate the original conversation.
// Otherwise, seed a brand-new chat with a single assistant turn carrying the
// draft so the user has something to revise from.
export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // RLS scopes this to the current user.
  const { data: draft, error: draftErr } = await supabase
    .from("drafts")
    .select("id, output, kind")
    .eq("id", id)
    .maybeSingle();
  if (draftErr) {
    return NextResponse.json({ error: draftErr.message }, { status: 500 });
  }
  if (!draft || draft.kind !== "originator" || !draft.output) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 1) Try the source chat first.
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("chat_id")
    .eq("draft_id", id)
    .limit(1)
    .maybeSingle();
  if (existing?.chat_id) {
    return NextResponse.json({ chatId: existing.chat_id, seeded: false });
  }

  // 2) Fallback: seed a fresh chat with one synthetic assistant turn.
  const chatId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const reply = "Here's the draft you saved — what do you want to change?";
  const title = deriveChatTitle(draft.output);

  const { error: chatErr } = await supabase.from("chats").insert({
    id: chatId,
    user_id: user.id,
    title,
    mode: "draft",
  });
  if (chatErr) {
    return NextResponse.json({ error: chatErr.message }, { status: 500 });
  }

  const { error: msgErr } = await supabase.from("chat_messages").insert({
    id: messageId,
    chat_id: chatId,
    user_id: user.id,
    role: "assistant",
    content: reply,
    mode_at_turn: "draft",
    draft: draft.output,
    hook_pattern: null,
    notes: null,
    exemplars: null,
    draft_id: id,
  });
  if (msgErr) {
    // Best-effort cleanup so we don't leave an empty chat hanging around.
    await supabase.from("chats").delete().eq("id", chatId);
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ chatId, seeded: true });
}
