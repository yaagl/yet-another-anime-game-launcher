import { OperationProgress } from "@sophon-rpc";
import { CommonProgressUICommand } from "@common-update-ui";
import { Locale } from "@locale";
import { humanFileSize } from "@utils";

export function progressCommands(
  progress: OperationProgress,
  locale: Locale
): CommonProgressUICommand[] {
  const { common } = progress.metrics;
  let metric = common.files;
  let label = locale.get("PATCHING");
  if (progress.phase === "metadata") {
    metric = common.metadata.manifests;
    label = locale.get("CHECKING_GAME");
  } else if ("verification" in progress.metrics) {
    if (progress.phase === "scanning") {
      metric = progress.metrics.verification.bytes;
      const files = progress.metrics.verification.files;
      label = locale.format("SCANNING_FILES", [
        String(files.completed),
        files.total === undefined ? "…" : String(files.total),
      ]);
    } else if (progress.phase === "trimming") {
      metric = progress.metrics.trimming;
      label = locale.get("ALLOCATING_FILE");
    } else {
      metric = progress.metrics.download;
      label = locale.get("DOWNLOADING");
    }
  } else if (progress.phase === "caching") {
    metric = progress.metrics.patch.data;
    label = locale.get("DOWNLOADING_UPDATE_FILE");
  } else if (progress.phase === "deleting") {
    metric = progress.metrics.deletion.files;
  }

  const details = [label];
  const download =
    "download" in progress.metrics
      ? progress.metrics.download
      : progress.metrics.patch.data;
  if (progress.phase === "running" || progress.phase === "caching") {
    details.push(
      humanFileSize(download.completed) +
        (download.total === undefined
          ? ""
          : " / " + humanFileSize(download.total))
    );
  }
  if (common.network.rate !== undefined) {
    details.push(humanFileSize(common.network.rate) + "/s");
  }
  const eta = common.timing.etaSeconds ?? metric.etaSeconds;
  if (eta !== undefined) {
    details.push(locale.format("TIME_REMAINING", [String(Math.ceil(eta))]));
  }
  return [
    metric.percentage === undefined
      ? ["setUndeterminedProgress"]
      : ["setProgress", metric.percentage],
    ["setStatusText", details.join(" · ")],
  ];
}
