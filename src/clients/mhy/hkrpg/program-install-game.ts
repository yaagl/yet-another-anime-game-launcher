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
  if (gameSegmentZips.length > 1) {
    throw new Error(
      "Assertation failed (gameSegmentZips.length > 1)! please file an issue.",
    );
  }
  const gameFileZip = gameSegmentZips[0];
  const downloadTmp = join(gameDir, ".ariatmp");
  const gameFileTmp = join(downloadTmp, "game.zip");
  await mkdirp(downloadTmp);
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];
  let gameFileStart = false;
  for await (const progress of aria2.doStreamingDownload({
    uri: gameFileZip,
    absDst: gameFileTmp,
  })) {
    if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
      continue;
    }
    gameFileStart = true;
    yield [
      "setStateText",
      "DOWNLOADING_FILE_PROGRESS",
      basename(gameFileZip),
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
  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
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
