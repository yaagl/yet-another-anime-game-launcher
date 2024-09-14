import { join, basename } from "path-browserify";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import {
  mkdirp,
  humanFileSize,
  doStreamUnzip,
  removeFile,
  writeFile,
  getKey,
  sha1sum,
  stats,
  setKey,
  exec,
  rawString,
} from "@utils";

export async function* downloadAndInstallGameProgram({
  aria2,
  gameSegmentZips,
  gameDir,
  gameVersion,
  server,
}: {
  gameSegmentZips: string[];
  gameDir: string;
  gameVersion: string;
  aria2: Aria2;
  server: Server;
}): CommonUpdateProgram {
  const downloadTmp = join(gameDir, ".ariatmp");

  await mkdirp(downloadTmp);

  const deferredCleanup: (() => Promise<void>)[] = [];

  for (const segment of gameSegmentZips) {
    deferredCleanup.push(
      yield* downloadOrRecover(
        aria2,
        segment,
        join(downloadTmp, basename(segment)),
      ),
    );
  }

  yield ["setUndeterminedProgress"];
  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
  const gameFileTmp = join(
    downloadTmp,
    basename(`${gameSegmentZips[0]}`.replace(".001", "")),
  );

  await exec([
    "cat",
    ...gameSegmentZips.map(x => join(downloadTmp, basename(x))),
    rawString(">"),
    gameFileTmp,
  ]);

  deferredCleanup.forEach(x => x());

  for await (const [dec, total] of doStreamUnzip(gameFileTmp, gameDir)) {
    yield ["setProgress", (dec / total) * 100];
  }
  await removeFile(gameFileTmp);

  await writeFile(
    join(gameDir, "config.ini"),
    `[General]
game_version=${gameVersion}
channel=${server.channel_id}
sub_channel=${server.subchannel_id}
cps=${server.cps}`,
  );
}

async function* downloadOrRecover(
  aria2: Aria2,
  remoteUrl: string,
  localTempUrl: string,
): CommonUpdateProgram<() => Promise<void>> {
  try {
    await getKey(
      `predownloaded_${(await sha1sum(basename(remoteUrl))).slice(0, 32)}`,
    );
    await stats(localTempUrl);
  } catch (e) {
    yield ["setUndeterminedProgress"];
    yield ["setStateText", "ALLOCATING_FILE"];
    let gameFileStart = false;
    for await (const progress of aria2.doStreamingDownload({
      uri: remoteUrl,
      absDst: localTempUrl,
    })) {
      if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
        continue;
      }
      gameFileStart = true;
      yield [
        "setStateText",
        "DOWNLOADING_FILE_PROGRESS",
        basename(remoteUrl),
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
    await setKey(
      `predownloaded_${(await sha1sum(basename(remoteUrl))).slice(0, 32)}`,
      "1",
    );
  }
  return async () => {
    await removeFile(localTempUrl);
    await setKey(
      `predownloaded_${(await sha1sum(basename(remoteUrl))).slice(0, 32)}`,
      null,
    );
  };
}
