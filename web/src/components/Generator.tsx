"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  hasStoredProfile,
  loadProfile,
  Target,
  TARGETS,
  TARGET_LABELS,
  VoiceProfile,
} from "@/lib/voice-profile";
import { loadModel, ModelId, saveModel } from "@/lib/model-settings";
import { ModelSelector } from "@/components/ModelSelector";

interface PlatformResult {
  output: string;
  fit_score: number;
  fit_flag: string | null;
  char_count: number;
  format_variant: string;
}

type CardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: PlatformResult }
  | { status: "error"; error: string };

const INITIAL_STATES: Record<Target, CardState> = {
  x: { status: "idle" },
  threads: { status: "idle" },
  substack_note: { status: "idle" },
  instagram: { status: "idle" },
  tiktok: { status: "idle" },
};

export function Generator() {
  const router = useRouter();
  const [source, setSource] = useState("");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [model, setModel] = useState<ModelId>("claude-sonnet-4-6");
  const [states, setStates] = useState<Record<Target, CardState>>(INITIAL_STATES);

  useEffect(() => {
    if (!hasStoredProfile()) {
      router.replace("/onboarding");
      return;
    }
    setProfile(loadProfile());
    setModel(loadModel());
  }, [router]);

  const handleModelChange = (next: ModelId) => {
    setModel(next);
    saveModel(next);
  };

  const enabledTargets: Target[] =
    profile?.settings.enabled_targets &&
    profile.settings.enabled_targets.length > 0
      ? profile.settings.enabled_targets
      : TARGETS;

  const isGenerating = Object.values(states).some(
    (s) => s.status === "loading"
  );

  const canGenerate =
    profile !== null && source.trim().length >= 10 && !isGenerating;

  const runOne = async (
    target: Target,
    options?: { feedback?: string; previousOutput?: string }
  ) => {
    if (!profile) return;
    setStates((prev) => ({ ...prev, [target]: { status: "loading" } }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          platform: target,
          profile,
          model,
          feedback: options?.feedback,
          previous_output: options?.previousOutput,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStates((prev) => ({
          ...prev,
          [target]: {
            status: "error",
            error: data.error ?? `HTTP ${res.status}`,
          },
        }));
        return;
      }
      setStates((prev) => ({
        ...prev,
        [target]: {
          status: "success",
          result: {
            output: data.output,
            fit_score: data.fit_score,
            fit_flag: data.fit_flag,
            char_count: data.char_count,
            format_variant: data.format_variant,
          },
        },
      }));
    } catch (e) {
      setStates((prev) => ({
        ...prev,
        [target]: {
          status: "error",
          error: e instanceof Error ? e.message : "Network error",
        },
      }));
    }
  };

  const handleGenerate = () => {
    if (!canGenerate) return;
    enabledTargets.forEach((t) => {
      runOne(t);
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col">
        <div className="px-4 py-2 text-sm font-medium border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
          <span>
            LinkedIn
            <span className="ml-2 text-xs font-normal text-zinc-400">
              source
            </span>
          </span>
        </div>
        <textarea
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Paste your LinkedIn post here..."
          className="w-full h-40 bg-transparent text-sm p-4 focus:outline-none resize-none"
        />
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-[11px] text-zinc-400 min-w-0">
            <span className="truncate">
              {profile === null
                ? "Loading voice profile..."
                : `Profile: ${profile.identity.display_name ?? profile.identity.role}`}
            </span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <ModelSelector value={model} onChange={handleModelChange} />
          </div>
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="rounded-full bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 px-4 py-1.5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isGenerating ? "Generating..." : "Generate →"}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {enabledTargets.map((target) => (
          <PlatformCard
            key={target}
            target={target}
            state={states[target]}
            onRegen={() => runOne(target)}
          />
        ))}
      </section>
    </div>
  );
}

function PlatformCard({
  target,
  state,
  onRegen,
}: {
  target: Target;
  state: CardState;
  onRegen: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (state.status !== "success") return;
    try {
      await navigator.clipboard.writeText(state.result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const canCopy = state.status === "success";
  const canRegen = state.status === "success" || state.status === "error";

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col min-h-[14rem]">
      <div className="px-4 py-2 text-sm font-medium border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
        <span>{TARGET_LABELS[target]}</span>
        {state.status === "success" && (
          <span className="text-[11px] text-zinc-400">
            {state.result.char_count} chars
            {state.result.fit_score < 60 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                fit {state.result.fit_score}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex-1 px-4 py-3 text-xs whitespace-pre-wrap">
        {state.status === "idle" && (
          <span className="text-zinc-400 italic">Output will appear here.</span>
        )}
        {state.status === "loading" && (
          <span className="text-zinc-400">
            <span className="inline-block animate-pulse">Generating…</span>
          </span>
        )}
        {state.status === "success" && (
          <>
            {state.result.fit_flag && (
              <div className="mb-2 text-amber-700 dark:text-amber-300 text-[11px] italic border-l-2 border-amber-400 pl-2">
                Fit check: {state.result.fit_flag}
              </div>
            )}
            <span className="text-zinc-800 dark:text-zinc-200">
              {state.result.output}
            </span>
          </>
        )}
        {state.status === "error" && (
          <span className="text-rose-600 dark:text-rose-400">
            {state.error}
          </span>
        )}
      </div>
      <div className="px-4 py-2 flex gap-4 border-t border-zinc-100 dark:border-zinc-900 text-xs">
        <button
          onClick={handleCopy}
          disabled={!canCopy}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          disabled
          className="text-zinc-300 dark:text-zinc-700 cursor-not-allowed"
          title="Feedback loop not wired up yet"
        >
          Feedback
        </button>
        <button
          onClick={onRegen}
          disabled={!canRegen}
          className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:text-zinc-300 dark:disabled:text-zinc-700 disabled:cursor-not-allowed"
        >
          Regen
        </button>
      </div>
    </div>
  );
}
