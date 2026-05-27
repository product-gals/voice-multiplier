import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { isUuid } from "@/lib/chat-history";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fire both queries in parallel — they don't depend on each other. RLS
  // gates both to user_id = auth.uid() so an unauthorized chat returns no
  // chat row and we short-circuit to 404 below.
  const [chatRes, messagesRes] = await Promise.all([
    supabase
      .from("chats")
      .select("id, title, mode, created_at, updated_at")
      .eq("id", id)
      .maybeSingle(),
    // Nested select: drafts!chat_messages_draft_id_fkey grabs the linked draft
    // row (if any) so we can surface saved_at to the client without a 2nd query.
    supabase
      .from("chat_messages")
      .select(
        "id, chat_id, role, content, mode_at_turn, draft, hook_pattern, notes, exemplars, draft_id, created_at, drafts(saved_at)",
      )
      .eq("chat_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const { data: chat, error: chatErr } = chatRes;
  const { data: messages, error: msgErr } = messagesRes;

  if (chatErr) {
    return NextResponse.json({ error: chatErr.message }, { status: 500 });
  }
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  // Supabase types nested selects as arrays even on a 1:1 FK. Normalize here.
  type Row = {
    id: string;
    chat_id: string;
    role: "user" | "assistant";
    content: string;
    mode_at_turn: string;
    draft: string | null;
    hook_pattern: string | null;
    notes: string | null;
    exemplars: unknown;
    draft_id: string | null;
    created_at: string;
    drafts: { saved_at: string | null }[] | { saved_at: string | null } | null;
  };

  const shaped = (messages ?? []).map((m) => {
    const row = m as unknown as Row;
    const draftRow = Array.isArray(row.drafts) ? row.drafts[0] : row.drafts;
    return {
      id: row.id,
      chat_id: row.chat_id,
      role: row.role,
      content: row.content,
      mode_at_turn: row.mode_at_turn,
      draft: row.draft,
      hook_pattern: row.hook_pattern,
      notes: row.notes,
      exemplars: row.exemplars,
      draft_id: row.draft_id,
      saved: draftRow?.saved_at != null,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({ chat, messages: shaped });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid chat id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.from("chats").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
