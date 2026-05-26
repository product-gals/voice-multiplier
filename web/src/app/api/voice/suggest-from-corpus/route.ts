// POST /api/voice/suggest-from-corpus
//
// Runs the Haiku onboarding extractor over a sample of the user's corpus and
// returns just the resulting observations[] (NOT the full extracted profile).
// We deliberately do not auto-merge — observations are surfaced to the user
// as suggestions on the voice page so they decide what to keep.
//
// Returns: { observations: string[], sampled: number }  on success
// Returns: { observations: [] } when the user has no corpus or no profile yet.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { getRecentUserPosts } from "@/lib/corpus";
import {
  buildExtractorSystem,
  buildExtractorUser,
  OnboardingIntake,
} from "@/lib/onboarding-prompts";
import type { VoiceProfile } from "@/lib/voice-profile";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5";
const SAMPLE_SIZE = 8;

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model output");
    return JSON.parse(match[0]);
  }
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Need the existing profile for identity context. If there isn't one yet,
  // bail quietly — onboarding handles that case.
  const { data: profileRow } = await supabase
    .from("voice_profiles")
    .select("profile")
    .eq("user_id", user.id)
    .maybeSingle();
  const profile = profileRow?.profile as VoiceProfile | undefined;
  if (!profile) {
    return NextResponse.json({ observations: [], sampled: 0 });
  }

  const posts = await getRecentUserPosts(supabase, user.id, SAMPLE_SIZE);
  if (posts.length === 0) {
    return NextResponse.json({ observations: [], sampled: 0 });
  }

  const intake: OnboardingIntake = {
    identity: {
      display_name: profile.identity.display_name,
      role: profile.identity.role,
      audience: profile.identity.audience,
      topics: profile.identity.topics,
      primary_platform: profile.identity.primary_platform,
    },
    example_posts: posts.map((p) => p.text),
  };

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: buildExtractorSystem(),
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: buildExtractorUser(intake) }],
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (!textBlock) {
      return NextResponse.json({ observations: [], sampled: posts.length });
    }

    const parsed = extractJson(textBlock.text) as {
      observations?: unknown;
    };
    const observations = Array.isArray(parsed.observations)
      ? parsed.observations.filter((s): s is string => typeof s === "string")
      : [];

    return NextResponse.json({ observations, sampled: posts.length });
  } catch (e) {
    // Suggestion is best-effort; never bubble up as an error that blocks the
    // user. Log server-side and return an empty list.
    console.error("[suggest-from-corpus] failed:", e);
    return NextResponse.json({ observations: [], sampled: posts.length });
  }
}
