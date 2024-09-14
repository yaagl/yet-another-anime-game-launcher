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
  extract7z,
} from "@utils";

export async function* downloadAndInstallGameProgram({
  aria2,
  gameFileZip,
  // gameAudioZip,
  gameDir,
  gameVersion,
  server,
}: {
  gameFileZip: string;
  gameDir: string;
  // gameAudioZip: string;
  gameVersion: string;
  aria2: Aria2;
  server: Server;
}): CommonUpdateProgram {
  const downloadTmp = join(gameDir, ".ariatmp");
  const gameFileTmp = join(downloadTmp, "game.7z");
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
  yield ["setUndeterminedProgress"];
  await extract7z(gameFileTmp, gameDir);
  // await removeFile(gameFileTmp);
}
