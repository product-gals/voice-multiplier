"use client";

import { ModelId, MODEL_OPTIONS } from "@/lib/model-settings";

export function ModelSelector({
  value,
  onChange,
}: {
  value: ModelId;
  onChange: (v: ModelId) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
      <span>Model:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
        className="bg-transparent border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      >
        {MODEL_OPTIONS.map((opt) => (
          <option key={opt.id} value={opt.id} title={opt.tagline}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
