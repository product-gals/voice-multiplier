"use client";

import { useEffect } from "react";
import { BUCKETS, TEMPLATES, type PostTemplate } from "@/lib/templates";

interface TemplatePickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (template: PostTemplate) => void;
}

export function TemplatePicker({ open, onClose, onPick }: TemplatePickerProps) {
  // Close on Escape — small affordance, big UX gain.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 bg-black/40"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">Pick a template</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Ozzy will help you fill in the [slots] and draft in your voice.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="px-5 py-4 space-y-6">
          {(["life", "expertise", "business"] as const).map((bucketId) => {
            const meta = BUCKETS[bucketId];
            const items = TEMPLATES.filter((t) => t.bucket === bucketId);
            return (
              <section key={bucketId}>
                <div className="mb-2">
                  <h3 className="text-xs uppercase tracking-wide font-semibold text-zinc-600 dark:text-zinc-300">
                    {meta.label}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {meta.description}
                  </p>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {items.map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => {
                          onPick(t);
                          onClose();
                        }}
                        className="w-full text-left rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors px-3 py-2"
                      >
                        <div className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                          {t.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono leading-snug">
                          {t.pattern}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
