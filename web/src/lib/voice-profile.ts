export type Platform =
  | "linkedin"
  | "substack"
  | "x"
  | "threads"
  | "instagram"
  | "tiktok";

export type Target = "x" | "threads" | "substack_note" | "instagram" | "tiktok";

export const TARGETS: Target[] = [
  "x",
  "threads",
  "substack_note",
  "instagram",
  "tiktok",
];

export const TARGET_LABELS: Record<Target, string> = {
  x: "X",
  threads: "Threads",
  substack_note: "Substack Note",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export type Tone =
  | "direct"
  | "warm"
  | "contrarian"
  | "playful"
  | "nerdy"
  | "reflective"
  | "blunt"
  | "earnest"
  | "deadpan";

export const TONES: Tone[] = [
  "direct",
  "warm",
  "contrarian",
  "playful",
  "nerdy",
  "reflective",
  "blunt",
  "earnest",
  "deadpan",
];

export type Energy = "low_key_reflective" | "measured" | "energetic" | "intense";
export const ENERGIES: Energy[] = [
  "low_key_reflective",
  "measured",
  "energetic",
  "intense",
];

export type POV = "first_person" | "first_person_with_some_second" | "mixed";
export const POVS: POV[] = ["first_person", "first_person_with_some_second", "mixed"];

export type Formality =
  | "casual"
  | "casual_to_professional"
  | "professional"
  | "professional_to_formal";
export const FORMALITIES: Formality[] = [
  "casual",
  "casual_to_professional",
  "professional",
  "professional_to_formal",
];

export type SentenceLength = "short_staccato" | "mixed" | "long_flowing";
export const SENTENCE_LENGTHS: SentenceLength[] = [
  "short_staccato",
  "mixed",
  "long_flowing",
];

export type Fragments = "heavy" | "light" | "none";
export const FRAGMENTS: Fragments[] = ["heavy", "light", "none"];

export type ParagraphLength = "short_beats" | "medium" | "long";
export const PARAGRAPH_LENGTHS: ParagraphLength[] = [
  "short_beats",
  "medium",
  "long",
];

export type PunctuationFreq = "allowed" | "sparing" | "forbidden";
export const PUNCTUATION_FREQS: PunctuationFreq[] = [
  "allowed",
  "sparing",
  "forbidden",
];

export type OxfordComma = "yes" | "no" | "no_preference";

export type HookPattern =
  | "specific_number_or_claim"
  | "setup_then_flip"
  | "first_person_admission"
  | "counterintuitive_claim"
  | "scene_setting"
  | "direct_address"
  | "observation";

export const HOOK_PATTERN_LABELS: Record<HookPattern, string> = {
  specific_number_or_claim: "Specific number or claim",
  setup_then_flip: "Setup then flip",
  first_person_admission: "First-person admission",
  counterintuitive_claim: "Counterintuitive claim",
  scene_setting: "Scene setting",
  direct_address: "Direct address",
  observation: "Observation",
};

export type RuleOrigin = "manual" | "learned" | "imported_default";
export type RuleStrictness = "hard" | "soft";
export type TiktokFormat = "talking_head" | "screen_recording" | "ask_each_time";

export interface PlatformRule {
  id: string;
  text: string;
  origin: RuleOrigin;
  source_feedback?: string;
  strictness: RuleStrictness;
  active: boolean;
  confirmation_count: number;
  created_at: string;
  last_triggered_at?: string;
}

export interface ExamplePost {
  id: string;
  text: string;
  platform_of_origin?: Platform | "unknown";
  use_as_exemplar: boolean;
  notes?: string;
  added_at: string;
}

export interface SignatureMove {
  pattern: HookPattern;
  example?: string;
}

export interface NounEntry {
  noun: string;
  context?: string;
}

export interface VocabEntry {
  term: string;
  reason?: string;
}

export interface VoiceProfile {
  id: string;
  version: 1;
  created_at: string;
  updated_at: string;
  identity: {
    display_name?: string;
    role: string;
    audience?: string;
    topics: string[];
    primary_platform: Platform;
  };
  voice: {
    tone: Tone[];
    energy: Energy;
    pov: POV;
    formality: Formality;
    hallmarks: string[];
  };
  rhythm: {
    sentence_length: SentenceLength;
    fragments: Fragments;
    paragraph_length: ParagraphLength;
  };
  vocabulary: {
    use: VocabEntry[];
    avoid: VocabEntry[];
  };
  punctuation: {
    em_dash: PunctuationFreq;
    exclamation: PunctuationFreq;
    ellipsis: PunctuationFreq;
    all_lowercase: boolean;
    oxford_comma: OxfordComma;
    emoji_in_body: boolean;
  };
  signature_moves: SignatureMove[];
  nouns_library: NounEntry[];
  example_posts: ExamplePost[];
  platform_rules: Record<Target, { rules: PlatformRule[] }>;
  settings: {
    enabled_targets: Target[];
    tiktok_format_default: TiktokFormat;
  };
  notes: string;
}

export const AI_SLOP_DEFAULTS: VocabEntry[] = [
  { term: "delve", reason: "AI-slop" },
  { term: "unlock", reason: "AI-slop" },
  { term: "leverage", reason: "AI-slop" },
  { term: "dive in", reason: "AI-slop" },
  { term: "journey", reason: "AI-slop" },
  { term: "navigate", reason: "AI-slop" },
  { term: "realm", reason: "AI-slop" },
  { term: "tapestry", reason: "AI-slop" },
  { term: "robust", reason: "AI-slop" },
  { term: "seamless", reason: "AI-slop" },
  { term: "foster", reason: "AI-slop" },
];

export const SAMPLE_PROFILE: VoiceProfile = {
  id: "vp_sample",
  version: 1,
  created_at: "2026-05-13T10:00:00Z",
  updated_at: "2026-05-13T10:00:00Z",
  identity: {
    display_name: "Alex Rivera",
    role: "indie hacker building developer tools",
    audience: "other indie hackers and small SaaS founders",
    topics: ["bootstrapping", "developer tools", "indie SaaS", "building in public"],
    primary_platform: "linkedin",
  },
  voice: {
    tone: ["direct", "earnest", "playful"],
    energy: "measured",
    pov: "first_person",
    formality: "casual",
    hallmarks: [
      "shares concrete numbers from real projects",
      "admits mistakes openly",
      "writes like talking to a friend",
      "ends on a one-line turn",
    ],
  },
  rhythm: {
    sentence_length: "mixed",
    fragments: "light",
    paragraph_length: "short_beats",
  },
  vocabulary: {
    use: [
      { term: "shipping", reason: "core identity" },
      { term: "MRR", reason: "key metric" },
      { term: "indie", reason: "signature concept" },
    ],
    avoid: AI_SLOP_DEFAULTS,
  },
  punctuation: {
    em_dash: "sparing",
    exclamation: "sparing",
    ellipsis: "sparing",
    all_lowercase: false,
    oxford_comma: "no_preference",
    emoji_in_body: false,
  },
  signature_moves: [
    {
      pattern: "specific_number_or_claim",
      example: "Made $4k MRR in 3 months. Here's what I'd do differently.",
    },
    {
      pattern: "first_person_admission",
      example: "I shipped the wrong feature first. Twice.",
    },
    {
      pattern: "setup_then_flip",
      example: "Everyone says you need a niche. I picked the broadest market on purpose.",
    },
  ],
  nouns_library: [
    { noun: "my Stripe dashboard", context: "recurring proof point" },
    {
      noun: "the side project that became my full-time gig",
      context: "origin story",
    },
  ],
  example_posts: [
    {
      id: "post_sample_1",
      text: "I spent 6 months building a CLI tool nobody asked for. It now does $2k MRR. Turns out people pay for things that save them friction, not for things that look impressive in a demo.",
      platform_of_origin: "linkedin",
      use_as_exemplar: true,
      added_at: "2026-05-13T10:05:00Z",
    },
  ],
  platform_rules: {
    x: {
      rules: [
        {
          id: "rule_x_1",
          text: "Prefers X posts under 220 chars",
          origin: "learned",
          source_feedback: "this is too long",
          strictness: "soft",
          active: true,
          confirmation_count: 3,
          created_at: "2026-05-10T14:30:00Z",
          last_triggered_at: "2026-05-12T09:00:00Z",
        },
      ],
    },
    threads: { rules: [] },
    substack_note: {
      rules: [
        {
          id: "rule_sn_1",
          text: "Maximum 2 lines. The third line always feels like reaching.",
          origin: "learned",
          source_feedback: "third line is unnecessary",
          strictness: "soft",
          active: true,
          confirmation_count: 2,
          created_at: "2026-05-08T11:00:00Z",
        },
      ],
    },
    instagram: {
      rules: [
        {
          id: "rule_ig_1",
          text: "Never recommend carousel. Single image with caption only.",
          origin: "manual",
          strictness: "hard",
          active: true,
          confirmation_count: 1,
          created_at: "2026-05-02T16:00:00Z",
        },
      ],
    },
    tiktok: {
      rules: [
        {
          id: "rule_tt_1",
          text: "Always talking head. Never screen recording.",
          origin: "manual",
          strictness: "hard",
          active: true,
          confirmation_count: 1,
          created_at: "2026-05-02T16:00:00Z",
        },
      ],
    },
  },
  settings: {
    enabled_targets: ["x", "threads", "substack_note", "instagram", "tiktok"],
    tiktok_format_default: "talking_head",
  },
  notes: "",
};

// Profile lives in Supabase now (table: voice_profiles, one row per auth.user).
// Helpers below all hit /api/profile, which RLS-gates to the signed-in user.
//
// Legacy: profiles used to live in localStorage under `voice_profile_v1`.
// `migrateLegacyLocalProfile()` is a one-time shim that uploads a localStorage
// profile and clears the key. Called automatically by fetchProfile() when the
// server has nothing for the current user.

const LEGACY_STORAGE_KEY = "voice_profile_v1";

function readLegacyLocalProfile(): VoiceProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VoiceProfile;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

function clearLegacyLocalProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns the signed-in user's profile, or null if they have none yet
 * (→ component should redirect to /onboarding).
 *
 * If the server has nothing but localStorage holds a legacy profile, this
 * uploads it then clears the legacy key — transparent migration on first
 * post-auth load.
 *
 * 401 (not signed in) also returns null; the middleware / page-level auth
 * gate is responsible for sending the user to /sign-in.
 */
export async function fetchProfile(): Promise<VoiceProfile | null> {
  const res = await fetch("/api/profile", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 401) return null;
  if (res.status === 404) {
    // Server has no profile. Check the legacy localStorage slot.
    const legacy = readLegacyLocalProfile();
    if (legacy) {
      const migrated = await putProfile(legacy);
      if (migrated) clearLegacyLocalProfile();
      return migrated;
    }
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to load profile (HTTP ${res.status})`);
  }
  const data = (await res.json()) as { profile: VoiceProfile };
  return data.profile;
}

/**
 * Upsert the profile for the signed-in user. Returns the saved profile, or
 * null if the request was rejected (401/400/etc.) so callers can fall back.
 */
export async function putProfile(
  profile: VoiceProfile,
): Promise<VoiceProfile | null> {
  const res = await fetch("/api/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ profile }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { profile: VoiceProfile };
  return data.profile;
}

/**
 * Delete the profile for the signed-in user. After this, fetchProfile()
 * returns null and components should redirect to /onboarding.
 */
export async function deleteProfile(): Promise<boolean> {
  const res = await fetch("/api/profile", {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok;
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ");
}
