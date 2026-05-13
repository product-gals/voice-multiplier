export type ModelId =
  | "claude-opus-4-7"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

export const MODEL_OPTIONS: { id: ModelId; label: string; tagline: string }[] = [
  { id: "claude-opus-4-7", label: "Opus 4.7", tagline: "highest quality, slowest" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", tagline: "balanced speed and quality" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", tagline: "fast and cheap" },
];

const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";
const STORAGE_KEY = "multiplier_model_v1";

export function isValidModel(v: unknown): v is ModelId {
  return MODEL_OPTIONS.some((o) => o.id === v);
}

export function loadModel(): ModelId {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isValidModel(raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_MODEL;
}

export function saveModel(model: ModelId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, model);
  } catch {
    // ignore
  }
}
