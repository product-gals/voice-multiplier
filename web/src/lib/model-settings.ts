export type ModelId =
  | "claude-opus-4-8"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5";

export const MODEL_OPTIONS: { id: ModelId; label: string; tagline: string }[] = [
  { id: "claude-opus-4-8", label: "Opus 4.8", tagline: "highest quality, slowest" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", tagline: "balanced speed and quality" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", tagline: "fast and cheap" },
];

export const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";

// Legacy: model selection used to live in localStorage under this key. We read
// it once on first fetch after migration; if present, we upload it to the
// server and clear the key.
const LEGACY_STORAGE_KEY = "multiplier_model_v1";

export function isValidModel(v: unknown): v is ModelId {
  return MODEL_OPTIONS.some((o) => o.id === v);
}

function readLegacyLocalModel(): ModelId | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw && isValidModel(raw) ? raw : null;
  } catch {
    return null;
  }
}

function clearLegacyLocalModel(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Returns the signed-in user's selected model, falling back to DEFAULT_MODEL.
 *
 * If the server has nothing but localStorage holds a legacy value, this uploads
 * it then clears the legacy key — transparent migration on first post-auth load.
 */
export async function fetchModel(): Promise<ModelId> {
  try {
    const res = await fetch("/api/preferences", {
      method: "GET",
      cache: "no-store",
      credentials: "include",
    });
    if (res.ok) {
      const data = (await res.json()) as { model: ModelId | null };
      if (data.model && isValidModel(data.model)) return data.model;
      // Server has no row yet — check the legacy localStorage slot.
      const legacy = readLegacyLocalModel();
      if (legacy) {
        const migrated = await putModel(legacy);
        if (migrated) clearLegacyLocalModel();
        return legacy;
      }
    }
  } catch {
    // ignore — fall through to default
  }
  return DEFAULT_MODEL;
}

/**
 * Fire-and-forget save. Returns true on success, false on any failure
 * (network, 401, 4xx). Callers update local state optimistically and don't
 * await this.
 */
export async function putModel(model: ModelId): Promise<boolean> {
  try {
    const res = await fetch("/api/preferences", {
      method: "PUT",
      cache: "no-store",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
