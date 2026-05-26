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

  const { data: chat, error: chatErr } = await supabase
    .from("chats")
    .select("id, title, mode, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (chatErr) {
    return NextResponse.json({ error: chatErr.message }, { status: 500 });
  }
  if (!chat) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: messages, error: msgErr } = await supabase
    .from("chat_messages")
    .select(
      "id, chat_id, role, content, mode_at_turn, draft, hook_pattern, notes, exemplars, created_at",
    )
    .eq("chat_id", id)
    .order("created_at", { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({ chat, messages: messages ?? [] });
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
