import { Target, TARGET_LABELS, VoiceProfile } from "@/lib/voice-profile";
import { PLATFORM_RULES } from "@/lib/platform-rules";
import { bullets, renderVoiceProfile } from "@/lib/voice-renderer";

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
