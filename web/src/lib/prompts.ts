import {
  Target,
  TARGET_LABELS,
  VoiceProfile,
  humanize,
} from "@/lib/voice-profile";
import { PLATFORM_RULES } from "@/lib/platform-rules";

function bullets(items: string[]): string {
  return items.map((s) => `- ${s}`).join("\n");
}

function renderVoiceProfile(profile: VoiceProfile): string {
  const lines: string[] = [];

  lines.push(`WRITER IDENTITY`);
  if (profile.identity.display_name) {
    lines.push(`Name: ${profile.identity.display_name}`);
  }
  lines.push(`Role: ${profile.identity.role}`);
  if (profile.identity.audience) {
    lines.push(`Audience: ${profile.identity.audience}`);
  }
  if (profile.identity.topics.length > 0) {
    lines.push(`Topics: ${profile.identity.topics.join(", ")}`);
  }
  lines.push("");

  lines.push(`VOICE`);
  lines.push(`Tone: ${profile.voice.tone.join(", ") || "(none specified)"}`);
  lines.push(`Energy: ${humanize(profile.voice.energy)}`);
  lines.push(`Point of view: ${humanize(profile.voice.pov)}`);
  lines.push(`Formality: ${humanize(profile.voice.formality)}`);
  if (profile.voice.hallmarks.length > 0) {
    lines.push(`Hallmarks:`);
    lines.push(bullets(profile.voice.hallmarks));
  }
  lines.push("");

  lines.push(`RHYTHM`);
  lines.push(`Sentence length: ${humanize(profile.rhythm.sentence_length)}`);
  lines.push(`Fragments: ${profile.rhythm.fragments}`);
  lines.push(`Paragraph length: ${humanize(profile.rhythm.paragraph_length)}`);
  lines.push("");

  if (profile.vocabulary.use.length > 0) {
    lines.push(`WORDS TO USE WHEN NATURAL`);
    lines.push(profile.vocabulary.use.map((v) => v.term).join(", "));
    lines.push("");
  }

  if (profile.vocabulary.avoid.length > 0) {
    lines.push(`WORDS TO NEVER USE`);
    lines.push(profile.vocabulary.avoid.map((v) => v.term).join(", "));
    lines.push("");
  }

  lines.push(`PUNCTUATION RULES`);
  lines.push(`- Em dashes: ${profile.punctuation.em_dash}`);
  lines.push(`- Exclamation points: ${profile.punctuation.exclamation}`);
  lines.push(`- Ellipses: ${profile.punctuation.ellipsis}`);
  lines.push(
    `- All-lowercase preference: ${profile.punctuation.all_lowercase ? "yes" : "no"}`
  );
  lines.push(
    `- Emoji in body: ${profile.punctuation.emoji_in_body ? "allowed" : "forbidden"}`
  );
  lines.push("");

  if (profile.signature_moves.length > 0) {
    lines.push(`SIGNATURE MOVES (hook patterns this writer reaches for)`);
    for (const m of profile.signature_moves) {
      const pattern = humanize(m.pattern);
      if (m.example) {
        lines.push(`- ${pattern} — e.g., "${m.example}"`);
      } else {
        lines.push(`- ${pattern}`);
      }
    }
    lines.push("");
  }

  if (profile.nouns_library.length > 0) {
    lines.push(
      `SPECIFIC NOUNS FROM THIS WRITER'S WORLD (use when source is abstract)`
    );
    for (const n of profile.nouns_library) {
      lines.push(`- ${n.noun}${n.context ? ` (${n.context})` : ""}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function renderPlatformRules(profile: VoiceProfile, target: Target): string {
  const rules = profile.platform_rules[target]?.rules ?? [];
  const active = rules.filter((r) => r.active);
  if (active.length === 0) return "";

  const hard = active.filter((r) => r.strictness === "hard");
  const soft = active.filter((r) => r.strictness === "soft");

  const sections: string[] = [];
  sections.push(`USER-SPECIFIC RULES FOR ${TARGET_LABELS[target].toUpperCase()}`);
  if (hard.length > 0) {
    sections.push(`Hard rules (must follow):`);
    sections.push(bullets(hard.map((r) => r.text)));
  }
  if (soft.length > 0) {
    sections.push(`Soft preferences (follow unless source demands otherwise):`);
    sections.push(bullets(soft.map((r) => r.text)));
  }
  return sections.join("\n");
}

export function buildSystemPrompt(
  profile: VoiceProfile,
  target: Target
): string {
  const parts = [
    `You are reformatting a LinkedIn post for ${TARGET_LABELS[target]}. ` +
      `Preserve the thesis and proof points; translate the form to be native to the platform. ` +
      `Honor the writer's voice profile.`,
    "",
    PLATFORM_RULES[target],
    "",
    renderVoiceProfile(profile),
  ];

  const platformRules = renderPlatformRules(profile, target);
  if (platformRules) {
    parts.push("");
    parts.push(platformRules);
  }

  parts.push("");
  parts.push(
    `OUTPUT FORMAT
Return JSON matching this exact shape:
{
  "output": string,       // the final post for this platform, ready to paste
  "fit_score": integer,   // 0-100, your confidence this source works on this platform
  "fit_flag": string|null,// if fit_score < 60, one sentence explaining the misfit; otherwise null
  "char_count": integer,  // character count of "output"
  "format_variant": string // e.g., "single_tweet", "thread", "talking_head"
}
Do not include any text outside the JSON.`
  );

  return parts.join("\n");
}

export function buildUserPrompt(
  source: string,
  previousOutput?: string,
  feedback?: string
): string {
  const parts = [`SOURCE LINKEDIN POST\n\n${source.trim()}`];

  if (previousOutput && feedback) {
    parts.push("");
    parts.push("PREVIOUS OUTPUT (regenerating because of feedback below)");
    parts.push(previousOutput.trim());
    parts.push("");
    parts.push(`USER FEEDBACK: "${feedback.trim()}"`);
    parts.push("");
    parts.push(
      "Produce a meaningfully different output that addresses the feedback. Preserve the core insight, proof point, and voice — change only what the feedback addresses. If the feedback contradicts a platform rule above, the platform rule still wins (e.g., don't exceed character limits)."
    );
  }

  return parts.join("\n");
}
