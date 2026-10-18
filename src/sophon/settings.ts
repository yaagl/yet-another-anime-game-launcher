import { createSignal } from "solid-js";
import { getKeyOrDefault, setKey } from "@utils";

export interface SophonSettings {
  downloads: number;
  writes: number;
  checks: number;
  postProcessors: number;
  maxRetries: number;
  retryInterval: number;
  maxCachedFileHandles: number;
  memoryMiB: number;
  diskGiB: number;
  diskCacheEnabled: boolean;
  entryLimit: number;
  ioPolicy: "parallel" | "serialized";
  writeMode: "temporary" | "in-place";
  preserveState: boolean;
  predownloadDirectory: string;
  debugLogging: boolean;
}

export const sophonDefaults: SophonSettings = {
  downloads: 8,
  writes: 4,
  checks: 8,
  postProcessors: 4,
  maxRetries: 10,
  retryInterval: 5,
  maxCachedFileHandles: 512,
  memoryMiB: 1024,
  diskGiB: 10,
  diskCacheEnabled: true,
  entryLimit: 500,
  ioPolicy: "parallel",
  writeMode: "temporary",
  preserveState: true,
  predownloadDirectory: "",
  debugLogging: false,
};

export const sophonNumberSettings = [
  { key: "downloads", label: "Concurrent downloads", min: 1, max: 16 },
  { key: "checks", label: "Verification workers", min: 1, max: 16 },
  { key: "postProcessors", label: "Post-processing workers", min: 1, max: 16 },
  { key: "writes", label: "Write workers", min: 1, max: 16 },
  { key: "memoryMiB", label: "Memory cache (MiB)", min: 0, max: 16384 },
  { key: "diskGiB", label: "Disk cache (GiB)", min: 1, max: 1024 },
  { key: "entryLimit", label: "Cache entry limit", min: 2, max: 4096 },
  {
    key: "maxCachedFileHandles",
    label: "Cached file handles",
    min: 1,
    max: 4096,
  },
  { key: "maxRetries", label: "Additional retries", min: 0, max: 20 },
  { key: "retryInterval", label: "Retry delay (seconds)", min: 0, max: 60 },
] as const;

export function sophonSettingsError(settings: SophonSettings): string {
  for (const field of sophonNumberSettings) {
    const value = settings[field.key];
    if (
      !Number.isSafeInteger(value) ||
      value < field.min ||
      value > field.max
    ) {
      return `${field.label} must be a whole number between ${field.min} and ${field.max}.`;
    }
  }
  if (!["parallel", "serialized"].includes(settings.ioPolicy))
    return "Choose parallel or serialized I/O.";
  if (!["temporary", "in-place"].includes(settings.writeMode))
    return "Choose a valid update write mode.";
  if (
    settings.maxCachedFileHandles <
    (settings.ioPolicy === "serialized" ? 1 : settings.writes)
  )
    return "Cached file handles must allow at least one handle per write worker.";
  for (const key of [
    "diskCacheEnabled",
    "preserveState",
    "debugLogging",
  ] as const) {
    if (typeof settings[key] !== "boolean")
      return "Invalid downloader setting.";
  }
  if (!settings.diskCacheEnabled && settings.writeMode === "in-place")
    return "In-place updates require disk caching.";
  if (!settings.diskCacheEnabled && settings.memoryMiB === 0)
    return "Memory cache must be greater than zero when disk caching is disabled.";
  if (
    typeof settings.predownloadDirectory !== "string" ||
    (settings.predownloadDirectory !== "" &&
      !settings.predownloadDirectory.startsWith("/")) ||
    settings.predownloadDirectory.includes("\0")
  )
    return "Choose an absolute path for predownloads.";
  return "";
}

export async function createSophonSettings() {
  let initial = { ...sophonDefaults };
  try {
    const stored = {
      ...sophonDefaults,
      ...JSON.parse(await getKeyOrDefault("config_sophon", "{}")),
    };
    for (const field of sophonNumberSettings) {
      const value = stored[field.key];
      stored[field.key] = Number.isFinite(value)
        ? Math.max(field.min, Math.min(field.max, Math.trunc(value)))
        : sophonDefaults[field.key];
    }
    stored.maxCachedFileHandles = Math.max(
      stored.maxCachedFileHandles,
      stored.ioPolicy === "serialized" ? 1 : stored.writes
    );
    if (!sophonSettingsError(stored)) initial = stored;
  } catch {
    // Use defaults if stored settings cannot be read.
  }
  const [settings, setSettings] = createSignal(initial);
  return {
    settings,
    async save(value: SophonSettings) {
      const error = sophonSettingsError(value);
      if (error) throw new Error(error);
      const next = { ...value };
      await setKey("config_sophon", JSON.stringify(next));
      setSettings(next);
    },
  };
}
