import { VoiceProfile, humanize } from "@/lib/voice-profile";

function bullets(items: string[]): string {
  return items.map((s) => `- ${s}`).join("\n");
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
