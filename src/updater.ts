import { Aria2 } from "./aria2";
import { Github, GithubReleaseInfo } from "./github";
import { gt } from "semver";
import { CURRENT_YAAGL_VERSION } from "./constants";
import {
  env,
  forceMove,
  log,
  resolve,
  rmrf_dangerously,
  mkdirp,
  tar_extract_directory,
  removeFile,
} from "./utils";
import { CommonUpdateProgram } from "./common-update-ui";

const owner = "3shain";
const repo = "yet-another-anime-game-launcher";

export async function createUpdater(deps: { github: Github; aria2: Aria2 }) {
  if (CURRENT_YAAGL_VERSION === "development") {
    return {
      latest: true,
    } as const;
  }
  try {
    let updateVersion = "";
    if (
      import.meta.env["YAAGL_CHANNEL_CLIENT"] &&
      import.meta.env["YAAGL_CHANNEL_CLIENT"] != "hk4euniversal"
    ) {
      updateVersion = import.meta.env["YAAGL_CHANNEL_CLIENT"];
    } else if ((await env("YAAGL_OS")) == "1") {
      updateVersion = "hk4eos";
    } else {
      updateVersion = "hk4ecn";
    }
    const latest: GithubReleaseInfo = (await deps.github.api(
      `/repos/${owner}/${repo}/releases/latest`
    )) as GithubReleaseInfo;
    const update_neu = `resources_${updateVersion}.neu`;
    const neu = latest.assets.find(x => x.name == update_neu);

    // Determine app bundle name based on updateVersion
    let appBundleName = "";
    switch (updateVersion) {
      case "hk4ecn":
        appBundleName = "Yaagl.app.tar.gz";
        break;
      case "hk4eos":
        appBundleName = "Yaagl.OS.app.tar.gz";
        break;
      case "bh3glb":
        appBundleName = "Yaagl.Honkai.Global.app.tar.gz";
        break;
      case "hkrpgcn":
        appBundleName = "Yaagl.HSR.app.tar.gz";
        break;
      case "hkrpgos":
        appBundleName = "Yaagl.HSR.OS.app.tar.gz";
        break;
      case "napcn":
        appBundleName = "Yaagl.ZZZ.app.tar.gz";
        break;
      case "napos":
        appBundleName = "Yaagl.ZZZ.OS.app.tar.gz";
        break;
    }
    const sidecar = latest.assets.find(x => x.name == appBundleName);

    if (gt(latest.tag_name, CURRENT_YAAGL_VERSION) && neu !== undefined) {
      return {
        latest: false,
        downloadUrl: neu.browser_download_url,
        sidecarDownloadUrl: sidecar?.browser_download_url,
        version: latest.tag_name,
        description: latest.body,
      } as const;
    }
    return {
      latest: true,
    } as const;
  } catch {
    return {
      latest: undefined,
    };
  }
}

export type Updater = ReturnType<typeof createUpdater> extends Promise<infer T>
  ? T
  : never;

export async function* downloadProgram(
  aria2: Aria2,
  url: string,
  sidecarUrl?: string
): CommonUpdateProgram {
  yield ["setStateText", "DOWNLOADING_UPDATE_FILE"];
  if (sidecarUrl) {
    for await (const progress of aria2.doStreamingDownload({
      uri: sidecarUrl,
      absDst: resolve("./sidecar.tar.gz"),
    })) {
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(50)) / progress.totalLength),
      ];
    }
    await rmrf_dangerously("./sidecar");
    await mkdirp("./sidecar");
    let topLevelDir = sidecarUrl.split("/").pop()?.replace(".tar.gz", "") || "";

    if (topLevelDir === "Yaagl.app") topLevelDir = "Yaagl.app";
    if (topLevelDir === "Yaagl.OS.app") topLevelDir = "Yaagl OS.app";
    if (topLevelDir === "Yaagl.Honkai.Global.app")
      topLevelDir = "Yaagl Honkai Global.app";
    if (topLevelDir === "Yaagl.HSR.app") topLevelDir = "Yaagl HSR.app";
    if (topLevelDir === "Yaagl.HSR.OS.app") topLevelDir = "Yaagl HSR OS.app";
    if (topLevelDir === "Yaagl.ZZZ.app") topLevelDir = "Yaagl ZZZ.app";
    if (topLevelDir === "Yaagl.ZZZ.OS.app") topLevelDir = "Yaagl ZZZ OS.app";

    await tar_extract_directory(
      "./sidecar.tar.gz",
      "./sidecar",
      `${topLevelDir}/Contents/Resources/sidecar`,
      false
    );

    await removeFile("./sidecar.tar.gz");
  }

  for await (const progress of aria2.doStreamingDownload({
    uri: url,
    absDst: resolve("./resources.neu.update"),
  })) {
    yield [
      "setProgress",
      sidecarUrl
        ? 50 +
          Number((progress.completedLength * BigInt(50)) / progress.totalLength)
        : Number(
            (progress.completedLength * BigInt(100)) / progress.totalLength
          ),
    ];
  }

  yield ["setUndeterminedProgress"];
  await forceMove("./resources.neu.update", "./resources.neu");
}
