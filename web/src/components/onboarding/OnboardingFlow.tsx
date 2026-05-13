"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  RadioRow,
  SectionShell,
  TextArea,
  TextInput,
} from "@/components/voice/SectionShell";
import { ChipList } from "@/components/voice/Chip";
import { Platform, saveProfile } from "@/lib/voice-profile";
import {
  buildProfileFromOnboarding,
  OnboardingExtracted,
  OnboardingIdentity,
  saveObservations,
} from "@/lib/onboarding";

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

type Step = "identity" | "materials" | "extracting" | "error";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identity");

  // Identity state
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("");
  const [audience, setAudience] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [primaryPlatform, setPrimaryPlatform] = useState<Platform>("linkedin");

  // Source materials state
  const [brandGuide, setBrandGuide] = useState("");
  const [examplePosts, setExamplePosts] = useState<string[]>([""]);

  // Error state
  const [error, setError] = useState<string | null>(null);

  const canContinueIdentity = role.trim().length > 0;
  const filledExamplePosts = examplePosts.filter((p) => p.trim().length >= 30);

  const handleExtract = async () => {
    setStep("extracting");
    setError(null);

    const identity: OnboardingIdentity = {
      display_name: displayName.trim() || undefined,
      role: role.trim(),
      audience: audience.trim() || undefined,
      topics,
      primary_platform: primaryPlatform,
    };

    try {
      const res = await fetch("/api/onboarding/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity,
          brand_guide: brandGuide.trim() || undefined,
          example_posts: filledExamplePosts.map((p) => p.trim()),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        setStep("error");
        return;
      }

      const extracted = data.extracted as OnboardingExtracted;
      const profile = buildProfileFromOnboarding(identity, extracted);
      saveProfile(profile);
      saveObservations(extracted.observations ?? []);
      router.push("/voice");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setStep("error");
    }
  };

  if (step === "extracting") {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 text-center space-y-3">
        <div className="text-sm font-medium">Reading your materials…</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 animate-pulse">
          Extracting voice patterns. ~5 seconds.
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 space-y-3">
        <div className="text-sm font-medium text-rose-700 dark:text-rose-300">
          Something went wrong
        </div>
        <div className="text-xs text-rose-600 dark:text-rose-400">{error}</div>
        <button
          onClick={() => setStep("materials")}
          className="text-xs text-zinc-600 dark:text-zinc-400 underline underline-offset-4"
        >
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up your voice
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Tell us who you are and (optionally) share your writing. We&rsquo;ll
          extract a voice profile you can edit.
        </p>
      </div>

      <ol className="flex items-center gap-3 text-xs">
        <StepDot active={step === "identity"} done={step !== "identity"}>
          1. Identity
        </StepDot>
        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
        <StepDot active={step === "materials"} done={false}>
          2. Materials
        </StepDot>
      </ol>

      {step === "identity" && (
        <SectionShell
          title="Identity"
          subtitle="The basics. Only role is required."
        >
          <Field label="Display name">
            <TextInput
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </Field>
          <Field label="Role" hint="One line. Used as context in every generation.">
            <TextInput
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g., fractional product leader for SaaS startups"
            />
          </Field>
          <Field label="Audience">
            <TextInput
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., seed-to-Series-B founders and product leaders"
            />
          </Field>
          <Field label="Topics" hint="Press Enter to add.">
            <ChipList
              items={topics}
              onAdd={(t) => setTopics([...topics, t])}
              onRemove={(t) => setTopics(topics.filter((x) => x !== t))}
              placeholder="Add topic"
            />
          </Field>
          <Field label="Primary platform" hint="Where you usually write first.">
            <RadioRow
              name="primary_platform"
              options={PLATFORMS}
              value={primaryPlatform}
              onChange={(v) => setPrimaryPlatform(v)}
              labelMap={PLATFORM_LABELS}
            />
          </Field>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep("materials")}
              disabled={!canContinueIdentity}
              className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </SectionShell>
      )}

      {step === "materials" && (
        <SectionShell
          title="Source materials"
          subtitle="Both optional, but stronger inputs make a sharper profile. Example posts beat brand guides — writing shows, telling describes."
        >
          <Field
            label="Brand or voice guide"
            hint="Paste a style guide, brand bible, or self-description if you have one."
          >
            <TextArea
              value={brandGuide}
              onChange={(e) => setBrandGuide(e.target.value)}
              placeholder="Paste your brand guide here..."
              rows={6}
            />
          </Field>

          <Field
            label="Example posts"
            hint={`Paste 3-10 posts you've written. Each one needs at least 30 characters. ${filledExamplePosts.length} valid right now.`}
          >
            <div className="space-y-3">
              {examplePosts.map((post, i) => (
                <div key={i} className="relative">
                  <TextArea
                    value={post}
                    onChange={(e) => {
                      const next = [...examplePosts];
                      next[i] = e.target.value;
                      setExamplePosts(next);
                    }}
                    placeholder={`Post ${i + 1}...`}
                    rows={4}
                  />
                  {examplePosts.length > 1 && (
                    <button
                      onClick={() =>
                        setExamplePosts(
                          examplePosts.filter((_, idx) => idx !== i)
                        )
                      }
                      className="absolute top-2 right-2 text-xs text-zinc-400 hover:text-rose-600"
                      aria-label="Remove post"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => setExamplePosts([...examplePosts, ""])}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-4"
              >
                + Add another post
              </button>
            </div>
          </Field>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setStep("identity")}
              className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Back
            </button>
            <button
              onClick={handleExtract}
              className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium"
            >
              {brandGuide.trim().length === 0 && filledExamplePosts.length === 0
                ? "Skip and use defaults"
                : "Extract voice profile →"}
            </button>
          </div>
        </SectionShell>
      )}
    </div>
  );
}

function StepDot({
  active,
  done,
  children,
}: {
  active: boolean;
  done: boolean;
  children: React.ReactNode;
}) {
  const cls = active
    ? "text-zinc-900 dark:text-zinc-50 font-medium"
    : done
    ? "text-zinc-500 dark:text-zinc-400"
    : "text-zinc-400 dark:text-zinc-600";
  return <li className={cls}>{children}</li>;
}
