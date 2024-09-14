import { Aria2 } from "./aria2";
import { Github, GithubReleaseInfo } from "./github";
import { gt } from "semver";
import { CURRENT_YAAGL_VERSION } from "./constants";
import { env, forceMove, log, resolve } from "./utils";
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
      `/repos/${owner}/${repo}/releases/latest`,
    )) as GithubReleaseInfo;
    const update_neu = `resources_${updateVersion}.neu`;
    const neu = latest.assets.find(x => x.name == update_neu);
    if (gt(latest.tag_name, CURRENT_YAAGL_VERSION) && neu !== undefined) {
      return {
        latest: false,
        downloadUrl: neu.browser_download_url,
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

export type Updater =
  ReturnType<typeof createUpdater> extends Promise<infer T> ? T : never;

export async function* downloadProgram(
  aria2: Aria2,
  url: string,
): CommonUpdateProgram {
  yield ["setStateText", "DOWNLOADING_UPDATE_FILE"];
  for await (const progress of aria2.doStreamingDownload({
    uri: url,
    absDst: resolve("./resources.neu.update"),
  })) {
    yield [
      "setProgress",
      Number((progress.completedLength * BigInt(100)) / progress.totalLength),
    ];
  }
  yield ["setUndeterminedProgress"];
  await forceMove("./resources.neu.update", "./resources.neu");
}
