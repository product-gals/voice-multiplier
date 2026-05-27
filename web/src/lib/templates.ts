// Post templates — structural patterns the user can layer on top of their
// voice profile. Pick a template, Ozzy asks 1-2 questions to fill the
// [slots], then drafts using the pattern + the writer's voice.
//
// Curated set transcribed from Meagan's "How to Post 5x a Week" infographic:
// three buckets (Life / Expertise / Business) on a 55/30/15 rotation. The
// ratios aren't shown in the UI but the bucket payoffs are baked into Ozzy's
// system prompt so he steers each draft toward the right emotional target.

export type TemplateBucket = "life" | "expertise" | "business";

export interface PostTemplate {
  id: string;
  name: string;
  bucket: TemplateBucket;
  // The pattern with [slots] preserved verbatim. Ozzy sees this in the system
  // prompt and uses it as the structural skeleton for the draft.
  pattern: string;
  // Slot labels extracted from the pattern so the UI and prompt can list them
  // without re-parsing. Order matches first appearance in the pattern.
  slots: string[];
}

export interface BucketMeta {
  id: TemplateBucket;
  label: string;
  // The emotional payoff the bucket aims for — passed to Ozzy so each draft
  // lands the right "what they should think" reaction.
  payoff: string;
  // One-liner shown in the picker so the user knows when to reach for this
  // bucket.
  description: string;
}

export const BUCKETS: Record<TemplateBucket, BucketMeta> = {
  life: {
    id: "life",
    label: "Life",
    payoff: "You get me",
    description: "POVs, observations, hot takes. Starts from lived reality.",
  },
  expertise: {
    id: "expertise",
    label: "Expertise",
    payoff: "You can get it done",
    description: "Processes, methods, results. Specifics that prove skill.",
  },
  business: {
    id: "business",
    label: "Business",
    payoff: "I need you NOW",
    description: "Wins, losses, client moments framed on ICP pain.",
  },
};

export const TEMPLATES: PostTemplate[] = [
  // ---------- LIFE ----------
  {
    id: "life_flaw_to_feature",
    name: "From flaw to feature",
    bucket: "life",
    pattern: "[Common advice]. Bish, I turned [flaw] into [flex].",
    slots: ["Common advice", "flaw", "flex"],
  },
  {
    id: "life_origin_wound",
    name: "Origin wound to present power",
    bucket: "life",
    pattern:
      "At [age], [painful thing]. At [today age], [superpower it created].",
    slots: ["age", "painful thing", "today age", "superpower it created"],
  },
  {
    id: "life_split_reality",
    name: "The split reality",
    bucket: "life",
    pattern:
      "[Time-bound win]. My audience says [positive]. I says [dark truth].",
    slots: ["Time-bound win", "positive", "dark truth"],
  },
  {
    id: "life_defiant_declaration",
    name: "The defiant declaration",
    bucket: "life",
    pattern:
      "I'll NEVER [trendy thing]. Unscalable? Please. I'm [identity flex].",
    slots: ["trendy thing", "identity flex"],
  },
  {
    id: "life_same_cry_new_why",
    name: "Same cry, new why",
    bucket: "life",
    pattern:
      "[Then], [bad emotion] with [nothing]. Now, [same emotion] cuz [surprise win].",
    slots: ["Then", "bad emotion", "nothing", "same emotion", "surprise win"],
  },

  // ---------- EXPERTISE ----------
  {
    id: "expertise_cheat_code",
    name: "Cheat code reveal",
    bucket: "expertise",
    pattern:
      "[Time] ago, I gutted [old thing]. [Results] later, I only use [new thing].",
    slots: ["Time", "old thing", "Results", "new thing"],
  },
  {
    id: "expertise_almost_didnt",
    name: "The almost didn't",
    bucket: "expertise",
    pattern:
      "[Big result]. But [chunk] came from [small thing(s)] I almost didn't [do].",
    slots: ["Big result", "chunk", "small thing(s)", "do"],
  },
  {
    id: "expertise_underdog_receipt",
    name: "The underdog receipt",
    bucket: "expertise",
    pattern:
      "[Time], [someone] [action] me from [small thing]. How I get [X] by [Y] ↓",
    slots: ["Time", "someone", "action", "small thing", "X", "Y"],
  },
  {
    id: "expertise_flaw_flex",
    name: "The flaw flex",
    bucket: "expertise",
    pattern:
      "I have the [weakness] of [silly thing]. Somehow it's worth [big result] here.",
    slots: ["weakness", "silly thing", "big result"],
  },
  {
    id: "expertise_rule_breaker",
    name: "The rule breaker",
    bucket: "expertise",
    pattern:
      "[Time], I helped [# people] hit [result]. By breaking every \"rule\" gurus swear by.",
    slots: ["Time", "# people", "result"],
  },

  // ---------- BUSINESS ----------
  {
    id: "business_worship_moment",
    name: "The worship moment",
    bucket: "business",
    pattern:
      "Someone just [extreme praise]. All because I [action] into [result].",
    slots: ["extreme praise", "action", "result"],
  },
  {
    id: "business_one_move_win",
    name: "The one move win",
    bucket: "business",
    pattern:
      "My [big client] scored [result] with [simple move]: [method]. Do this ↓",
    slots: ["big client", "result", "simple move", "method"],
  },
  {
    id: "business_plot_twist_loss",
    name: "The plot twist loss",
    bucket: "business",
    pattern:
      "Got fired by my client. [Most gurus] would expect I'd []. That's [expletive].",
    // The empty `[]` is intentional in the source — it's a slot the writer
    // fills with their own expected-but-wrong reaction.
    slots: ["Most gurus", "expected reaction", "expletive"],
  },
  {
    id: "business_anti_method_win",
    name: "The anti-method win",
    bucket: "business",
    pattern:
      "[Expletive], my [big] client just [result]. They don't [trend(s)]. They [].",
    slots: ["Expletive", "big", "result", "trend(s)", "what they do instead"],
  },
  {
    id: "business_stop_paying_me",
    name: "The stop paying me",
    bucket: "business",
    pattern:
      "Told client to stop paying. Not 'cuz [bad reason]. It was [good reason].",
    slots: ["bad reason", "good reason"],
  },
];

export function findTemplate(id: string): PostTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function templatesByBucket(bucket: TemplateBucket): PostTemplate[] {
  return TEMPLATES.filter((t) => t.bucket === bucket);
}
