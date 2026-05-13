import { Platform } from "@/lib/voice-profile";

export interface OnboardingIntake {
  identity: {
    display_name?: string;
    role: string;
    audience?: string;
    topics: string[];
    primary_platform: Platform;
  };
  brand_guide?: string;
  example_posts: string[];
}

export function buildExtractorSystem(): string {
  return `
You are a voice profile extractor for a content reformatting tool.

The user is onboarding. They've provided their identity, optionally a brand/voice guide, and optionally some example posts they've written. Your job: extract a structured voice profile that captures HOW they write.

EXTRACTION PRINCIPLES
- Example posts are higher signal than brand guides. People often write differently than they describe.
- Only extract patterns that appear in 2+ example posts, or that are explicitly stated in the brand guide. Single-post observations are noise.
- For vocabulary.use: only include words/phrases that are distinctive to this writer's voice (not common words). Include the reason ("appears in 3 posts as signature term").
- For signature_moves: classify each example post's opener against the canonical hook patterns (below). Only include patterns that appear in 2+ posts. Use a verbatim quote from a real post as the example.
- For nouns_library: extract concrete specifics from posts ("12 SaaS audits", "the founder I worked with last quarter"). Skip generic categories ("startups", "founders").
- For hallmarks: stylistic moves observed in 2+ posts (e.g., "sets up conventional wisdom then flips it", "ends on a one-line turn"). Free text.
- For punctuation: measure from posts. If 0 of N posts use em dashes, set "forbidden". If 2+ posts use them, "allowed". If 1 post does, "sparing".

CANONICAL HOOK PATTERNS
- specific_number_or_claim: opens with a precise stat/number/fact
- setup_then_flip: states conventional belief then flips it
- first_person_admission: vulnerable confessional opener
- counterintuitive_claim: flat declarative against received wisdom
- scene_setting: places reader in a specific moment/place
- direct_address: speaks to a specific reader ("If you're...")
- observation: third-party narrative subject

OBSERVATIONS
Return 2-3 brief, specific observations about what you noticed. Each starts with a verb or noun phrase. Examples:
- "Uses setup_then_flip in 4 of 6 posts — your strongest move."
- "Never uses em dashes — locked as a hard rule."
- "\"Discovery\" and \"ICP\" recur across posts — added as signature terms."
These get surfaced to the user as a moment of "we read your stuff."

OUTPUT FORMAT
Return JSON matching this exact shape. Use null for fields you can't infer.
{
  "voice": {
    "tone": ["direct"|"warm"|"contrarian"|"playful"|"nerdy"|"reflective"|"blunt"|"earnest"|"deadpan", ...up to 4],
    "energy": "low_key_reflective"|"measured"|"energetic"|"intense",
    "pov": "first_person"|"first_person_with_some_second"|"mixed",
    "formality": "casual"|"casual_to_professional"|"professional"|"professional_to_formal",
    "hallmarks": ["..."]
  },
  "rhythm": {
    "sentence_length": "short_staccato"|"mixed"|"long_flowing",
    "fragments": "heavy"|"light"|"none",
    "paragraph_length": "short_beats"|"medium"|"long"
  },
  "vocabulary_use": [{"term": "...", "reason": "..."}],
  "signature_moves": [{"pattern": "<canonical_id>", "example": "<verbatim quote>"}],
  "nouns_library": [{"noun": "...", "context": "..."}],
  "punctuation": {
    "em_dash": "allowed"|"sparing"|"forbidden",
    "exclamation": "allowed"|"sparing"|"forbidden",
    "ellipsis": "allowed"|"sparing"|"forbidden",
    "all_lowercase": true|false,
    "emoji_in_body": true|false
  },
  "observations": ["...", "...", "..."]
}

Do not include any text outside the JSON.
`.trim();
}

export function buildExtractorUser(intake: OnboardingIntake): string {
  const parts: string[] = [];

  parts.push("WRITER IDENTITY (provided by the user)");
  if (intake.identity.display_name) {
    parts.push(`Name: ${intake.identity.display_name}`);
  }
  parts.push(`Role: ${intake.identity.role}`);
  if (intake.identity.audience) {
    parts.push(`Audience: ${intake.identity.audience}`);
  }
  if (intake.identity.topics.length > 0) {
    parts.push(`Topics: ${intake.identity.topics.join(", ")}`);
  }
  parts.push(`Primary platform: ${intake.identity.primary_platform}`);

  if (intake.brand_guide && intake.brand_guide.trim().length > 0) {
    parts.push("");
    parts.push("BRAND / VOICE GUIDE");
    parts.push(intake.brand_guide.trim());
  }

  if (intake.example_posts.length > 0) {
    parts.push("");
    parts.push(`EXAMPLE POSTS (${intake.example_posts.length})`);
    intake.example_posts.forEach((post, i) => {
      parts.push("");
      parts.push(`--- POST ${i + 1} ---`);
      parts.push(post.trim());
    });
  }

  if (
    (!intake.brand_guide || intake.brand_guide.trim().length === 0) &&
    intake.example_posts.length === 0
  ) {
    parts.push("");
    parts.push(
      "No brand guide or example posts provided. Infer reasonable defaults from the identity above. Mark observations field with one note: 'No source materials provided — review and edit the extracted profile to match your voice.'"
    );
  }

  return parts.join("\n");
}
