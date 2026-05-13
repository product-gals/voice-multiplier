import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { Target, VoiceProfile } from "@/lib/voice-profile";
import { isValidModel, ModelId } from "@/lib/model-settings";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

interface GenerateRequest {
  source: string;
  platform: Target;
  profile: VoiceProfile;
  model?: ModelId;
  previous_output?: string;
  feedback?: string;
}

interface GenerateResult {
  output: string;
  fit_score: number;
  fit_flag: string | null;
  char_count: number;
  format_variant: string;
}

const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";

function isTarget(v: unknown): v is Target {
  return (
    v === "x" ||
    v === "threads" ||
    v === "substack_note" ||
    v === "instagram" ||
    v === "tiktok"
  );
}

function extractJson(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Fall back to extracting the first {...} block
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in model output");
    return JSON.parse(match[0]);
  }
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

  const ip = getClientIp(request.headers);
  const rateLimit = checkRateLimit(ip);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit reached. Try again in ${rateLimit.retryAfterSeconds}s.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      }
    );
  }

  let body: GenerateRequest;
  try {
    body = (await request.json()) as GenerateRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  const {
    source,
    platform,
    profile,
    model: requestedModel,
    previous_output: previousOutput,
    feedback,
  } = body;
  const model: ModelId = isValidModel(requestedModel)
    ? requestedModel
    : DEFAULT_MODEL;

  if (!source || typeof source !== "string" || source.trim().length < 10) {
    return NextResponse.json(
      { error: "Source post is required and must be at least 10 chars" },
      { status: 400 }
    );
  }
  if (!isTarget(platform)) {
    return NextResponse.json(
      { error: `Invalid platform: ${platform}` },
      { status: 400 }
    );
  }
  if (!profile || typeof profile !== "object") {
    return NextResponse.json(
      { error: "Voice profile is required" },
      { status: 400 }
    );
  }

  const client = new Anthropic();
  const systemPrompt = buildSystemPrompt(profile, platform);
  const userPrompt = buildUserPrompt(
    source,
    typeof previousOutput === "string" ? previousOutput : undefined,
    typeof feedback === "string" ? feedback : undefined
  );

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userPrompt }],
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

    let parsed: GenerateResult;
    try {
      parsed = extractJson(textBlock.text) as GenerateResult;
    } catch (e) {
      return NextResponse.json(
        {
          error: "Could not parse model output as JSON",
          raw: textBlock.text.slice(0, 500),
        },
        { status: 502 }
      );
    }

    if (
      typeof parsed.output !== "string" ||
      typeof parsed.fit_score !== "number"
    ) {
      return NextResponse.json(
        { error: "Model output missing required fields", got: parsed },
        { status: 502 }
      );
    }

    return NextResponse.json({
      platform,
      output: parsed.output,
      fit_score: parsed.fit_score,
      fit_flag: parsed.fit_flag ?? null,
      char_count: parsed.char_count ?? parsed.output.length,
      format_variant: parsed.format_variant ?? "default",
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
        cache_creation_input_tokens:
          response.usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
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
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
