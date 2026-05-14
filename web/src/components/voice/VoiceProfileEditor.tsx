"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { loadAndClearObservations } from "@/lib/onboarding";
import {
  AI_SLOP_DEFAULTS,
  ENERGIES,
  Energy,
  FORMALITIES,
  Formality,
  FRAGMENTS,
  Fragments,
  HOOK_PATTERN_LABELS,
  PARAGRAPH_LENGTHS,
  ParagraphLength,
  Platform,
  POV,
  POVS,
  PunctuationFreq,
  PUNCTUATION_FREQS,
  SentenceLength,
  SENTENCE_LENGTHS,
  TARGET_LABELS,
  TARGETS,
  Tone,
  TONES,
  VoiceProfile,
  hasStoredProfile,
  humanize,
  loadProfile,
  resetProfile,
  saveProfile,
} from "@/lib/voice-profile";
import { ChipList, ToggleChip } from "@/components/voice/Chip";
import {
  Field,
  RadioRow,
  SectionShell,
  TextArea,
  TextInput,
} from "@/components/voice/SectionShell";

const PLATFORMS: Platform[] = [
  "linkedin",
  "substack",
  "x",
  "threads",
  "instagram",
  "tiktok",
];

const PLATFORM_LABELS: Record<Platform, string> = {
  linkedin: "LinkedIn",
  substack: "Substack",
  x: "X",
  threads: "Threads",
  instagram: "Instagram",
  tiktok: "TikTok",
};

export function VoiceProfileEditor() {
  const router = useRouter();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [observations, setObservations] = useState<string[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasStoredProfile()) {
      router.replace("/onboarding");
      return;
    }
    setProfile(loadProfile());
    setObservations(loadAndClearObservations());
  }, [router]);

  useEffect(() => {
    if (profile) saveProfile(profile);
  }, [profile]);

  if (!profile) {
    return (
      <div className="text-sm text-zinc-400 py-12 text-center">
        Loading profile…
      </div>
    );
  }

  const update = (patch: Partial<VoiceProfile>) => {
    setProfile((prev) =>
      prev
        ? { ...prev, ...patch, updated_at: new Date().toISOString() }
        : prev
    );
  };

  const updateIdentity = (patch: Partial<VoiceProfile["identity"]>) =>
    update({ identity: { ...profile.identity, ...patch } });

  const updateVoice = (patch: Partial<VoiceProfile["voice"]>) =>
    update({ voice: { ...profile.voice, ...patch } });

  const updateRhythm = (patch: Partial<VoiceProfile["rhythm"]>) =>
    update({ rhythm: { ...profile.rhythm, ...patch } });

  const updateVocab = (patch: Partial<VoiceProfile["vocabulary"]>) =>
    update({ vocabulary: { ...profile.vocabulary, ...patch } });

  const updatePunct = (patch: Partial<VoiceProfile["punctuation"]>) =>
    update({ punctuation: { ...profile.punctuation, ...patch } });

  const toggleTone = (tone: Tone) => {
    const set = new Set(profile.voice.tone);
    if (set.has(tone)) {
      set.delete(tone);
    } else if (set.size < 4) {
      set.add(tone);
    }
    updateVoice({ tone: Array.from(set) });
  };

  const deletePlatformRule = (target: (typeof TARGETS)[number], ruleId: string) => {
    const next = { ...profile.platform_rules };
    next[target] = {
      rules: next[target].rules.filter((r) => r.id !== ruleId),
    };
    update({ platform_rules: next });
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Reset to the sample profile? Your current edits will be lost."
      )
    ) {
      setProfile(resetProfile());
    }
  };

  const handleSeedAvoid = () => {
    const existing = new Set(profile.vocabulary.avoid.map((v) => v.term));
    const additions = AI_SLOP_DEFAULTS.filter((v) => !existing.has(v.term));
    if (additions.length === 0) return;
    updateVocab({ avoid: [...profile.vocabulary.avoid, ...additions] });
  };

  const handleExport = () => {
    const json = JSON.stringify(profile, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug =
      profile.identity.display_name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
      "profile";
    a.href = url;
    a.download = `voice-profile-${slug}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (
        !parsed ||
        typeof parsed !== "object" ||
        !parsed.identity ||
        !parsed.voice ||
        !parsed.platform_rules ||
        parsed.version !== 1
      ) {
        window.alert(
          "That doesn't look like a valid voice profile file (expected schema version 1)."
        );
        return;
      }
      setProfile({ ...parsed, updated_at: new Date().toISOString() });
    } catch {
      window.alert("Could not read that file as JSON.");
    }
  };

  const handleDelete = () => {
    if (
      window.confirm(
        "Delete this voice profile? You'll be sent to onboarding to start fresh. This cannot be undone."
      )
    ) {
      resetProfile();
      router.push("/onboarding");
    }
  };

  const toggleTarget = (t: (typeof TARGETS)[number]) => {
    const current = profile.settings.enabled_targets;
    const next = current.includes(t)
      ? current.filter((x) => x !== t)
      : [...current, t];
    update({
      settings: { ...profile.settings, enabled_targets: next },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Voice profile
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Edit anything below. Changes save automatically to this browser.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/onboarding"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Onboard
          </Link>
          <button
            onClick={handleExport}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Export
          </button>
          <button
            onClick={handleImportClick}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Import
          </button>
          <button
            onClick={handleReset}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            Reset to sample
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </div>

      {observations.length > 0 && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4 space-y-2">
          <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            We noticed:
          </div>
          <ul className="space-y-1 text-xs text-emerald-800 dark:text-emerald-200">
            {observations.map((obs, i) => (
              <li key={i}>• {obs}</li>
            ))}
          </ul>
          <p className="text-[11px] text-emerald-700/70 dark:text-emerald-300/70 italic pt-1">
            Review the profile below and edit anything that doesn&rsquo;t fit.
          </p>
        </div>
      )}

      {/* IDENTITY */}
      <SectionShell
        title="Identity"
        subtitle="Who you are and what you write about."
      >
        <Field label="Display name">
          <TextInput
            value={profile.identity.display_name ?? ""}
            onChange={(e) =>
              updateIdentity({ display_name: e.target.value || undefined })
            }
            placeholder="Your name"
          />
        </Field>
        <Field label="Role" hint="One-line role description used as context.">
          <TextInput
            value={profile.identity.role}
            onChange={(e) => updateIdentity({ role: e.target.value })}
            placeholder="e.g., fractional product leader for SaaS startups"
          />
        </Field>
        <Field label="Audience">
          <TextInput
            value={profile.identity.audience ?? ""}
            onChange={(e) =>
              updateIdentity({ audience: e.target.value || undefined })
            }
            placeholder="e.g., seed-to-Series-B founders and product leaders"
          />
        </Field>
        <Field label="Topics" hint="What you write about. Press Enter to add.">
          <ChipList
            items={profile.identity.topics}
            onAdd={(t) =>
              updateIdentity({ topics: [...profile.identity.topics, t] })
            }
            onRemove={(t) =>
              updateIdentity({
                topics: profile.identity.topics.filter((x) => x !== t),
              })
            }
            placeholder="Add topic"
          />
        </Field>
        <Field label="Primary platform" hint="Where you usually write first.">
          <RadioRow
            name="primary_platform"
            options={PLATFORMS}
            value={profile.identity.primary_platform}
            onChange={(v) => updateIdentity({ primary_platform: v })}
            labelMap={PLATFORM_LABELS}
          />
        </Field>
      </SectionShell>

      {/* VOICE */}
      <SectionShell
        title="Voice"
        subtitle="The soul of the profile. Tone, energy, hallmarks."
      >
        <Field label="Tone" hint="Pick up to 4 that describe how you write.">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => {
              const active = profile.voice.tone.includes(t);
              const atMax = profile.voice.tone.length >= 4 && !active;
              return (
                <ToggleChip
                  key={t}
                  active={active}
                  onClick={() => toggleTone(t)}
                  disabled={atMax}
                >
                  {t}
                </ToggleChip>
              );
            })}
          </div>
        </Field>
        <Field label="Energy">
          <RadioRow
            name="energy"
            options={ENERGIES}
            value={profile.voice.energy}
            onChange={(v: Energy) => updateVoice({ energy: v })}
          />
        </Field>
        <Field label="Point of view">
          <RadioRow
            name="pov"
            options={POVS}
            value={profile.voice.pov}
            onChange={(v: POV) => updateVoice({ pov: v })}
          />
        </Field>
        <Field label="Formality">
          <RadioRow
            name="formality"
            options={FORMALITIES}
            value={profile.voice.formality}
            onChange={(v: Formality) => updateVoice({ formality: v })}
          />
        </Field>
        <Field
          label="Hallmarks"
          hint="Stylistic moves you make. Press Enter to add."
        >
          <ChipList
            items={profile.voice.hallmarks}
            onAdd={(t) =>
              updateVoice({ hallmarks: [...profile.voice.hallmarks, t] })
            }
            onRemove={(t) =>
              updateVoice({
                hallmarks: profile.voice.hallmarks.filter((x) => x !== t),
              })
            }
            placeholder="Add hallmark"
          />
        </Field>
      </SectionShell>

      {/* RHYTHM */}
      <SectionShell
        title="Rhythm"
        subtitle="How your sentences and paragraphs flow."
      >
        <Field label="Sentence length">
          <RadioRow
            name="sentence_length"
            options={SENTENCE_LENGTHS}
            value={profile.rhythm.sentence_length}
            onChange={(v: SentenceLength) =>
              updateRhythm({ sentence_length: v })
            }
          />
        </Field>
        <Field label="Fragments">
          <RadioRow
            name="fragments"
            options={FRAGMENTS}
            value={profile.rhythm.fragments}
            onChange={(v: Fragments) => updateRhythm({ fragments: v })}
          />
        </Field>
        <Field label="Paragraph length">
          <RadioRow
            name="paragraph_length"
            options={PARAGRAPH_LENGTHS}
            value={profile.rhythm.paragraph_length}
            onChange={(v: ParagraphLength) =>
              updateRhythm({ paragraph_length: v })
            }
          />
        </Field>
      </SectionShell>

      {/* VOCABULARY */}
      <SectionShell
        title="Vocabulary"
        subtitle="Words to reach for, words to avoid."
        meta={
          <button
            onClick={handleSeedAvoid}
            className="hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
          >
            + AI-slop defaults
          </button>
        }
      >
        <Field label="Use" hint="Words you reach for. Press Enter to add.">
          <ChipList
            items={profile.vocabulary.use.map((v) => v.term)}
            onAdd={(term) =>
              updateVocab({
                use: [...profile.vocabulary.use, { term }],
              })
            }
            onRemove={(term) =>
              updateVocab({
                use: profile.vocabulary.use.filter((v) => v.term !== term),
              })
            }
            placeholder="Add word"
          />
        </Field>
        <Field label="Avoid" hint="Words to never use.">
          <ChipList
            items={profile.vocabulary.avoid.map((v) => v.term)}
            onAdd={(term) =>
              updateVocab({
                avoid: [...profile.vocabulary.avoid, { term }],
              })
            }
            onRemove={(term) =>
              updateVocab({
                avoid: profile.vocabulary.avoid.filter((v) => v.term !== term),
              })
            }
            placeholder="Add word"
            variant="avoid"
          />
        </Field>
      </SectionShell>

      {/* PUNCTUATION */}
      <SectionShell title="Punctuation" subtitle="The fine print.">
        <Field label="Em dashes">
          <RadioRow
            name="em_dash"
            options={PUNCTUATION_FREQS}
            value={profile.punctuation.em_dash}
            onChange={(v: PunctuationFreq) => updatePunct({ em_dash: v })}
          />
        </Field>
        <Field label="Exclamation points">
          <RadioRow
            name="exclamation"
            options={PUNCTUATION_FREQS}
            value={profile.punctuation.exclamation}
            onChange={(v: PunctuationFreq) => updatePunct({ exclamation: v })}
          />
        </Field>
        <Field label="Ellipses">
          <RadioRow
            name="ellipsis"
            options={PUNCTUATION_FREQS}
            value={profile.punctuation.ellipsis}
            onChange={(v: PunctuationFreq) => updatePunct({ ellipsis: v })}
          />
        </Field>
        <div className="flex flex-wrap gap-6">
          <Field label="All lowercase">
            <ToggleChip
              active={profile.punctuation.all_lowercase}
              onClick={() =>
                updatePunct({
                  all_lowercase: !profile.punctuation.all_lowercase,
                })
              }
            >
              {profile.punctuation.all_lowercase ? "On" : "Off"}
            </ToggleChip>
          </Field>
          <Field label="Emoji in body">
            <ToggleChip
              active={profile.punctuation.emoji_in_body}
              onClick={() =>
                updatePunct({
                  emoji_in_body: !profile.punctuation.emoji_in_body,
                })
              }
            >
              {profile.punctuation.emoji_in_body ? "Allowed" : "Forbidden"}
            </ToggleChip>
          </Field>
        </div>
      </SectionShell>

      {/* SIGNATURE MOVES (read-only) */}
      <SectionShell
        title="Signature moves"
        subtitle="Hook patterns you reach for. Extracted from your posts."
        meta={<span>read-only for now</span>}
      >
        {profile.signature_moves.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">
            None detected yet. Add example posts to populate this.
          </p>
        ) : (
          <ul className="space-y-3">
            {profile.signature_moves.map((m, i) => (
              <li key={i} className="space-y-1">
                <div className="text-sm font-medium">
                  {HOOK_PATTERN_LABELS[m.pattern]}
                </div>
                {m.example && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 italic border-l-2 border-zinc-200 dark:border-zinc-800 pl-3">
                    &ldquo;{m.example}&rdquo;
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* NOUNS LIBRARY (read-only) */}
      <SectionShell
        title="Nouns library"
        subtitle="Recurring specifics from your writing. Used to ground generated content."
        meta={<span>read-only for now</span>}
      >
        {profile.nouns_library.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {profile.nouns_library.map((n, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{n.noun}</span>
                {n.context && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                    — {n.context}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* EXAMPLE POSTS */}
      <SectionShell
        title="Example posts"
        subtitle="Posts that train your voice profile."
        meta={
          <span>{profile.example_posts.length} on file · upload coming soon</span>
        }
      >
        {profile.example_posts.length === 0 ? (
          <p className="text-xs text-zinc-400 italic">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {profile.example_posts.map((p) => (
              <li
                key={p.id}
                className="border border-zinc-200 dark:border-zinc-800 rounded-md p-3 flex gap-3 items-start"
              >
                <div className="flex-1 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {p.text}
                  <div className="mt-2 text-[11px] text-zinc-400">
                    {p.platform_of_origin && (
                      <span>
                        from {PLATFORM_LABELS[p.platform_of_origin as Platform] ?? p.platform_of_origin} ·{" "}
                      </span>
                    )}
                    added {new Date(p.added_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() =>
                    update({
                      example_posts: profile.example_posts.filter(
                        (x) => x.id !== p.id
                      ),
                    })
                  }
                  className="text-xs text-zinc-400 hover:text-rose-600"
                  aria-label="Remove post"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionShell>

      {/* PLATFORM RULES */}
      <SectionShell
        title="Platform rules"
        subtitle="Rules per platform. Most come from your feedback as you generate."
      >
        <div className="space-y-4">
          {TARGETS.map((target) => {
            const rules = profile.platform_rules[target].rules;
            return (
              <div
                key={target}
                className="border border-zinc-200 dark:border-zinc-800 rounded-md"
              >
                <div className="px-3 py-2 text-sm font-medium border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                  <span>{TARGET_LABELS[target]}</span>
                  <span className="text-xs text-zinc-400">
                    {rules.length} {rules.length === 1 ? "rule" : "rules"}
                  </span>
                </div>
                <div className="p-3">
                  {rules.length === 0 ? (
                    <p className="text-xs text-zinc-400 italic">No rules yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {rules.map((r) => (
                        <li
                          key={r.id}
                          className="flex items-start gap-3 text-xs"
                        >
                          <div className="flex-1 space-y-1">
                            <div className="text-zinc-800 dark:text-zinc-200">
                              {r.text}
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              <Badge tone={r.strictness === "hard" ? "solid" : "muted"}>
                                {r.strictness}
                              </Badge>
                              <Badge tone={r.origin === "learned" ? "info" : "muted"}>
                                {humanize(r.origin)}
                              </Badge>
                              {r.confirmation_count > 1 && (
                                <Badge tone="muted">
                                  reinforced ×{r.confirmation_count}
                                </Badge>
                              )}
                            </div>
                            {r.source_feedback && (
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                                from feedback: &ldquo;{r.source_feedback}&rdquo;
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => deletePlatformRule(target, r.id)}
                            className="text-zinc-400 hover:text-rose-600"
                            aria-label="Delete rule"
                          >
                            Delete
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SectionShell>

      {/* TARGET PLATFORMS */}
      <SectionShell
        title="Target platforms"
        subtitle="Which platforms to generate for. Disabled platforms won't appear on the Generate page."
      >
        <div className="flex flex-wrap gap-2">
          {TARGETS.map((t) => {
            const active = profile.settings.enabled_targets.includes(t);
            return (
              <ToggleChip
                key={t}
                active={active}
                onClick={() => toggleTarget(t)}
              >
                {TARGET_LABELS[t]}
              </ToggleChip>
            );
          })}
        </div>
        {profile.settings.enabled_targets.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 italic">
            No platforms enabled — Generate will fall back to all 5.
          </p>
        )}
      </SectionShell>

      {/* NOTES */}
      <SectionShell title="Notes" subtitle="Anything else worth remembering.">
        <TextArea
          value={profile.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Free-form notes about your voice…"
          rows={3}
        />
      </SectionShell>

      {/* DANGER ZONE */}
      <section className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/30 dark:bg-rose-950/20 p-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            Delete profile
          </h3>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
            Wipes this profile from your browser and sends you to onboarding.
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs font-medium px-3 py-1.5 rounded-md border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-colors"
        >
          Delete
        </button>
      </section>

      <p className="text-[11px] text-zinc-400 text-center pt-2">
        Updated {new Date(profile.updated_at).toLocaleString()}
      </p>
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "solid" | "muted" | "info";
}) {
  const palette =
    tone === "solid"
      ? "bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
      : tone === "info"
      ? "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900"
      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800";
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded border ${palette}`}
    >
      {children}
    </span>
  );
}

