import {
  AI_SLOP_DEFAULTS,
  HookPattern,
  Platform,
  Tone,
  VoiceProfile,
} from "@/lib/voice-profile";

const OBSERVATIONS_KEY = "voice_profile_observations_v1";

export interface OnboardingExtracted {
  voice?: {
    tone?: Tone[];
    energy?: VoiceProfile["voice"]["energy"];
    pov?: VoiceProfile["voice"]["pov"];
    formality?: VoiceProfile["voice"]["formality"];
    hallmarks?: string[];
  };
  rhythm?: Partial<VoiceProfile["rhythm"]>;
  vocabulary_use?: { term: string; reason?: string }[];
  signature_moves?: { pattern: HookPattern; example?: string }[];
  nouns_library?: { noun: string; context?: string }[];
  punctuation?: Partial<VoiceProfile["punctuation"]>;
  observations?: string[];
}

export interface OnboardingIdentity {
  display_name?: string;
  role: string;
  audience?: string;
  topics: string[];
  primary_platform: Platform;
}

function genId(): string {
  return `vp_${Math.random().toString(36).slice(2, 12)}${Date.now().toString(36)}`;
}

export function buildProfileFromOnboarding(
  identity: OnboardingIdentity,
  extracted: OnboardingExtracted
): VoiceProfile {
  const now = new Date().toISOString();

  return {
    id: genId(),
    version: 1,
    created_at: now,
    updated_at: now,
    identity: {
      display_name: identity.display_name,
      role: identity.role,
      audience: identity.audience,
      topics: identity.topics,
      primary_platform: identity.primary_platform,
    },
    voice: {
      tone: extracted.voice?.tone ?? ["direct"],
      energy: extracted.voice?.energy ?? "measured",
      pov: extracted.voice?.pov ?? "first_person",
      formality: extracted.voice?.formality ?? "casual_to_professional",
      hallmarks: extracted.voice?.hallmarks ?? [],
    },
    rhythm: {
      sentence_length: extracted.rhythm?.sentence_length ?? "mixed",
      fragments: extracted.rhythm?.fragments ?? "light",
      paragraph_length: extracted.rhythm?.paragraph_length ?? "short_beats",
    },
    vocabulary: {
      use: extracted.vocabulary_use ?? [],
      avoid: AI_SLOP_DEFAULTS,
    },
    punctuation: {
      em_dash: extracted.punctuation?.em_dash ?? "sparing",
      exclamation: extracted.punctuation?.exclamation ?? "sparing",
      ellipsis: extracted.punctuation?.ellipsis ?? "sparing",
      all_lowercase: extracted.punctuation?.all_lowercase ?? false,
      oxford_comma: "no_preference",
      emoji_in_body: extracted.punctuation?.emoji_in_body ?? false,
    },
    signature_moves: extracted.signature_moves ?? [],
    nouns_library: extracted.nouns_library ?? [],
    example_posts: [],
    platform_rules: {
      x: { rules: [] },
      threads: { rules: [] },
      substack_note: { rules: [] },
      instagram: { rules: [] },
      tiktok: { rules: [] },
    },
    settings: {
      enabled_targets: ["x", "threads", "substack_note", "instagram", "tiktok"],
      tiktok_format_default: "talking_head",
    },
    notes: "",
  };
}

export function saveObservations(observations: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(OBSERVATIONS_KEY, JSON.stringify(observations));
  } catch {
    // ignore
  }
}

export function loadAndClearObservations(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(OBSERVATIONS_KEY);
    if (!raw) return [];
    window.sessionStorage.removeItem(OBSERVATIONS_KEY);
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s) => typeof s === "string");
    }
    return [];
  } catch {
    return [];
  }
}
