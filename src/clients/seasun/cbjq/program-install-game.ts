import { join, basename, dirname } from "path-browserify";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "../server";
import {
  humanFileSize,
  log,
  mkdirp,
  removeFile,
  stats,
  writeFile,
} from "@utils";
import { LauncherResourceData } from "./launcher-info";

export async function* downloadAndInstallGameProgram({
  aria2,
  resourceData,
  gameDir,
  server,
}: {
  resourceData: LauncherResourceData;
  gameDir: string;
  aria2: Aria2;
  server: Server;
}): CommonUpdateProgram {
  let index = 0;
  for (const pak of resourceData.paks) {
    await mkdirp(join(gameDir, dirname(pak.name)));
    // TODO: change this to concurrent
    yield* downloadOrRecover(
      aria2,
      join(server.dlc, resourceData.pathOffset, pak.hash).replace(":/", "://"), //....join: wtf?
      join(gameDir, pak.name),
      index++,
      resourceData.paks.length,
    );
  }

  await writeFile(join(gameDir, "manifest.json"), JSON.stringify(resourceData));
}

async function* downloadOrRecover(
  aria2: Aria2,
  remoteUrl: string,
  localUrl: string,
  fileIndex: number,
  totalFileCount: number,
): CommonUpdateProgram<void> {
  try {
    await stats(localUrl);
  } catch (e) {
    yield ["setUndeterminedProgress"];
    yield ["setStateText", "ALLOCATING_FILE"];
    await log(remoteUrl);
    let gameFileStart = false;
    for await (const progress of aria2.doStreamingDownload({
      uri: remoteUrl,
      absDst: localUrl,
    })) {
      if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
        continue;
      }
      gameFileStart = true;
      yield [
        "setStateText",
        "DOWNLOADING_FILE_PROGRESS",
        basename(remoteUrl) + `(${fileIndex}/${totalFileCount})`,
        humanFileSize(Number(progress.downloadSpeed)),
        humanFileSize(Number(progress.completedLength)),
        humanFileSize(Number(progress.totalLength)),
      ];
      yield [
        "setProgress",
        Number(
          (progress.completedLength * BigInt(10000)) / progress.totalLength,
        ) / 100,
      ];
    }
  }
}
