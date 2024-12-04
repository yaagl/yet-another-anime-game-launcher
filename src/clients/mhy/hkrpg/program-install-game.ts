import { join, basename } from "path-browserify";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import {
  mkdirp,
  humanFileSize,
  doStreamUn7z,
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
  const downloadTmp = join(gameDir, ".ariatmp");
  const downloadedFiles: string[] = [];

  await mkdirp(downloadTmp);
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];

  // Download each segmented file
  for (const gameFile7z of gameSegmentZips) {
    const localFile = join(downloadTmp, basename(gameFile7z));
    for await (const progress of aria2.doStreamingDownload({
      uri: gameFile7z,
      absDst: localFile,
    })) {
      yield [
        "setStateText",
        "DOWNLOADING_FILE_PROGRESS",
        basename(gameFile7z),
        humanFileSize(Number(progress.downloadSpeed)),
        humanFileSize(Number(progress.completedLength)),
        humanFileSize(Number(progress.totalLength)),
      ];
      yield [
        "setProgress",
        Number(
          (progress.completedLength * BigInt(10000)) / progress.totalLength
        ) / 100,
      ];
    }
    downloadedFiles.push(localFile); // Save the downloaded file path
  }

  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];

  for await (const [dec, total] of doStreamUn7z(downloadedFiles, gameDir)) {
    yield ["setProgress", (dec / total) * 100];
  }

  await writeFile(
    join(gameDir, "config.ini"),
    `[General]
game_version=${gameVersion}
channel=${server.channel_id}
sub_channel=${server.subchannel_id}
cps=${server.cps}`
  );

  for (const file of downloadedFiles) {
    await removeFile(file);
  }
}
