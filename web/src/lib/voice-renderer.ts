import {
  PunctuationFreq,
  VoiceProfile,
  humanize,
} from "@/lib/voice-profile";

function bullets(items: string[]): string {
  return items.map((s) => `- ${s}`).join("\n");
}

// Per-punctuation imperatives. We render the version that matches the user's
// setting so the model sees a directive ("NEVER use em dashes (—) …") instead
// of a vague label ("Em dashes: forbidden") it can easily ignore.
interface PunctRuleVariants {
  forbidden: string;
  sparing: string;
  allowed: string;
}

const EM_DASH_RULE: PunctRuleVariants = {
  forbidden:
    `NEVER use em dashes (—), en dashes (–), or double hyphens (--) anywhere in the post. ` +
    `If you would normally use one, use a period, a comma, a colon, or a line break instead. ` +
    `This is the writer's #1 voice rule — violating it makes the post read as AI-written.`,
  sparing:
    `Use em dashes (—) very sparingly — at most once per post, and only when no other punctuation works as well.`,
  allowed: `Em dashes (—) are allowed when they fit the rhythm.`,
};

const EXCLAIM_RULE: PunctRuleVariants = {
  forbidden:
    `NEVER use exclamation points (!). The writer's voice is dry, not enthusiastic — exclamation points break the tone.`,
  sparing:
    `Use exclamation points very sparingly — at most one per post, and only for genuine surprise or emphasis.`,
  allowed: `Exclamation points are allowed when they fit the energy.`,
};

const ELLIPSIS_RULE: PunctRuleVariants = {
  forbidden:
    `NEVER use ellipses (... or …). They read as drifting or unsure — the writer's voice is direct.`,
  sparing:
    `Use ellipses (... or …) very sparingly — only for a deliberate trailing-off effect.`,
  allowed: `Ellipses (... or …) are allowed when they fit the rhythm.`,
};

function renderPunctRule(
  label: string,
  freq: PunctuationFreq,
  variants: PunctRuleVariants,
): string {
  // The label is kept so a human reading the prompt can scan the list; the
  // imperative is what the model actually follows.
  return `- ${label}: ${variants[freq]}`;
}

export function renderVoiceProfile(profile: VoiceProfile): string {
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
  lines.push(renderPunctRule("Em dash", profile.punctuation.em_dash, EM_DASH_RULE));
  lines.push(
    renderPunctRule("Exclamation point", profile.punctuation.exclamation, EXCLAIM_RULE),
  );
  lines.push(
    renderPunctRule("Ellipsis", profile.punctuation.ellipsis, ELLIPSIS_RULE),
  );
  if (profile.punctuation.all_lowercase) {
    lines.push(
      `- ALWAYS write in all lowercase. Do not capitalize the first word of sentences, proper nouns, or "I". This is a deliberate stylistic choice — never "correct" it.`,
    );
  } else {
    lines.push(`- Use standard capitalization.`);
  }
  if (profile.punctuation.emoji_in_body) {
    lines.push(`- Emoji in body: allowed, but use sparingly.`);
  } else {
    lines.push(`- NEVER use emoji in the post body.`);
  }
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

  if (profile.notes && profile.notes.trim().length > 0) {
    lines.push(
      `WRITER'S NOTES (free-form voice instructions — treat as directives, not source content)`,
    );
    lines.push(profile.notes.trim());
    lines.push("");
  }

  const favorites = profile.example_posts.filter((p) => p.use_as_exemplar);
  if (favorites.length > 0) {
    lines.push(
      `FAVORITE POSTS — the writer hand-picked these as voice exemplars. Match THIS cadence, hook style, and rhythm. Do not copy phrases or anecdotes from them; treat as voice reference only.`
    );
    favorites.forEach((p, i) => {
      lines.push("");
      lines.push(`[favorite ${i + 1}]`);
      lines.push(p.text.trim());
      if (p.notes && p.notes.trim().length > 0) {
        lines.push(`(writer's note: ${p.notes.trim()})`);
      }
    });
    lines.push("");
  }

  return lines.join("\n").trim();
}

export { bullets };
