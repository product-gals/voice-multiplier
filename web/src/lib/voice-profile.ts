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
    display_name: "Meagan",
    role: "fractional product leader for SaaS startups",
    audience: "seed-to-Series-B founders and product leaders",
    topics: ["fractional work", "product management", "SaaS activation", "ICP"],
    primary_platform: "linkedin",
  },
  voice: {
    tone: ["direct", "contrarian", "reflective"],
    energy: "measured",
    pov: "first_person",
    formality: "casual_to_professional",
    hallmarks: [
      "sets up conventional wisdom, then flips it",
      "uses specific numbers as proof",
      "first-person admissions over abstractions",
      "ends on a one-line turn",
    ],
  },
  rhythm: {
    sentence_length: "short_staccato",
    fragments: "heavy",
    paragraph_length: "short_beats",
  },
  vocabulary: {
    use: [
      { term: "fractional", reason: "core identity" },
      { term: "activation", reason: "key topic" },
      { term: "discovery", reason: "signature concept" },
      { term: "ICP", reason: "recurring frame" },
    ],
    avoid: AI_SLOP_DEFAULTS,
  },
  punctuation: {
    em_dash: "forbidden",
    exclamation: "forbidden",
    ellipsis: "sparing",
    all_lowercase: false,
    oxford_comma: "no_preference",
    emoji_in_body: false,
  },
  signature_moves: [
    {
      pattern: "specific_number_or_claim",
      example: "I audited 12 SaaS funnels. 9 had the same leak.",
    },
    {
      pattern: "first_person_admission",
      example: "I ignored the work my client hired me for. For three weeks.",
    },
    {
      pattern: "setup_then_flip",
      example: "Every fractional pitch sells freedom. That wasn't my why.",
    },
  ],
  nouns_library: [
    { noun: "Prodfolio", context: "the product I'm building" },
    {
      noun: "the founder who hired me to build a roadmap",
      context: "recurring story",
    },
    { noun: "12 SaaS audits", context: "track-record proof point" },
  ],
  example_posts: [
    {
      id: "post_sample_1",
      text: "I've been thinking a lot about why most product roadmaps fail. After working with 12 SaaS companies as a fractional product leader, I've noticed that the roadmaps that fail aren't the ones with the wrong features — they're the ones built without understanding the ICP.",
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

const STORAGE_KEY = "voice_profile_v1";

export function loadProfile(): VoiceProfile {
  if (typeof window === "undefined") return SAMPLE_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SAMPLE_PROFILE;
    const parsed = JSON.parse(raw) as VoiceProfile;
    if (parsed.version === 1) return parsed;
    return SAMPLE_PROFILE;
  } catch {
    return SAMPLE_PROFILE;
  }
}

export function saveProfile(profile: VoiceProfile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // quota or serialization failure — no-op for v0
  }
}

export function resetProfile(): VoiceProfile {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return SAMPLE_PROFILE;
}

export function humanize(value: string): string {
  return value.replace(/_/g, " ");
}
