import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import {
  buildExtractorSystem,
  buildExtractorUser,
  OnboardingIntake,
} from "@/lib/onboarding-prompts";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5";

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model output");
    return JSON.parse(match[0]);
  }
}

function isValidIntake(body: unknown): body is OnboardingIntake {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!b.identity || typeof b.identity !== "object") return false;
  const id = b.identity as Record<string, unknown>;
  if (typeof id.role !== "string" || id.role.trim().length === 0) return false;
  if (typeof id.primary_platform !== "string") return false;
  if (!Array.isArray(id.topics)) return false;
  if (!Array.isArray(b.example_posts)) return false;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!isValidIntake(body)) {
    return NextResponse.json(
      { error: "Intake missing required fields (identity.role, identity.primary_platform, identity.topics, example_posts)" },
      { status: 400 }
    );
  }

  const intake = body;
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
      (b): b is Anthropic.TextBlock => b.type === "text"
    );
    if (!textBlock) {
      return NextResponse.json(
        { error: "Model returned no text content" },
        { status: 502 }
      );
    }

    let parsed: unknown;
    try {
      parsed = extractJson(textBlock.text);
    } catch {
      return NextResponse.json(
        {
          error: "Could not parse model output as JSON",
          raw: textBlock.text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      extracted: parsed,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
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
