import { batch, createSignal } from "solid-js";
import type {
  OperationParameters,
  OperationProgress,
  OperationStatus,
  SophonMetric,
} from "@sophon-rpc";

export const activityMetrics = [
  ["common.network", "Network download", "bytes"],
  ["common.read", "File reads", "bytes"],
  ["common.write", "Output", "bytes"],
  ["common.files", "Completed files", "files"],
  ["common.metadata.manifests", "All manifests", "manifests"],
  [
    "common.metadata.installationManifests",
    "Installation manifests",
    "manifests",
  ],
  ["common.metadata.diffManifests", "Diff manifests", "manifests"],
  ["common.metadata.planning", "Planning", "steps"],
  ["common.resources.target.read", "Game-file reads", "bytes"],
  ["common.resources.target.write", "Game-file writes", "bytes"],
  ["common.resources.memoryCache.read", "Memory-cache reads", "bytes"],
  ["common.resources.memoryCache.write", "Memory-cache writes", "bytes"],
  ["common.resources.diskCache.read", "Disk-cache reads", "bytes"],
  ["common.resources.diskCache.write", "Disk-cache writes", "bytes"],
  ["verification.bytes", "Verification: assessed bytes", "bytes"],
  ["verification.chunks", "Verification: chunks", "chunks"],
  ["verification.files", "Verification: files", "files"],
  ["trimming", "Trimmed files", "files"],
  ["download", "Download payload", "bytes"],
  ["processing.chunks", "Processed chunks", "chunks"],
  ["patch.data", "Patch payload", "bytes"],
  ["patch.network", "New patch traffic", "bytes"],
  ["repair.download", "Repair download", "bytes"],
  ["repair.write", "Repair output", "bytes"],
  ["deletion.files", "Deleted files", "files"],
  ["deletion.bytes", "Deleted bytes", "bytes"],
] as const;

export function activityMetric(
  progress: OperationProgress | undefined,
  key: string
) {
  if (
    key === "common.resources.target.read" &&
    !progress?.metrics.common.resources
  )
    return progress?.metrics.common.read;
  let value: unknown = progress?.metrics;
  for (const part of key.split(".")) {
    value =
      value && typeof value === "object"
        ? (value as Record<string, unknown>)[part]
        : undefined;
  }
  return value as SophonMetric | undefined;
}

export interface ActivitySample {
  time: number;
  values: Record<string, number | undefined>;
}

export interface SophonActivity extends Omit<OperationStatus, "operationID"> {
  operationID?: string;
  kind: "install" | "update";
  game: string;
  predownload: boolean;
  sourceVersion?: string;
  targetVersion?: string;
}

export function createSophonActivity() {
  const [activity, setActivity] = createSignal<SophonActivity>();
  const [history, setHistory] = createSignal<ActivitySample[]>([]);
  let latest: SophonActivity | undefined;

  function start(
    kind: SophonActivity["kind"],
    params: OperationParameters,
    targetVersion?: string
  ) {
    latest = {
      kind,
      game: params.game,
      predownload: Boolean(params.predownload),
      sourceVersion: params.sourceVersion,
      targetVersion,
      status: "starting",
    };
    batch(() => {
      setActivity(latest);
      setHistory([]);
    });
  }

  function record(status: Partial<OperationStatus>) {
    if (!latest) return;
    latest = {
      ...latest,
      ...status,
      progress: status.progress ?? latest.progress,
    };
    const progress = latest.progress;
    const time = progress?.metrics.common.timing.elapsedSeconds;
    const previous = activity();
    const samples = history();
    const last = samples[samples.length - 1];
    if (
      time !== undefined &&
      last &&
      Math.floor(time) === Math.floor(last.time) &&
      previous?.status === latest.status &&
      previous?.progress?.phase === progress?.phase &&
      latest.status === "running"
    )
      return;

    batch(() => {
      setActivity(latest);
      if (!progress || time === undefined) return;
      const values: ActivitySample["values"] = {};
      for (const [key] of activityMetrics)
        values[key] = activityMetric(progress, key)?.rate;
      const resources = progress.metrics.common.resources;
      if (resources) {
        values.memory = resources.memoryBytes;
        values.reserved = resources.diskReservedBytes;
        values.stored = resources.devices.reduce(
          (sum, device) => sum + device.cacheBytes,
          0
        );
        const rates = resources.devices.map(device => device.write.rate);
        values["disk.write"] =
          rates.length && rates.every(rate => rate !== undefined)
            ? rates.reduce<number>((sum, rate) => sum + (rate ?? 0), 0)
            : undefined;
        for (const direction of ["read", "write"] as const) {
          for (const device of resources.devices) {
            values[`volume:${device.id}:${direction}`] = device[direction].rate;
          }
        }
      }
      setHistory([
        ...samples.filter(
          sample =>
            time - sample.time <= 60 &&
            Math.floor(sample.time) < Math.floor(time)
        ),
        { time, values },
      ]);
    });
  }

  return {
    activity,
    history,
    start,
    record,
    fail(error: unknown) {
      if (latest?.status === "starting" || latest?.status === "running") {
        record({ status: "failed", error: String(error) });
      }
    },
  };
}
