import { join, basename } from "path-browserify";
import { Aria2 } from "../aria2";
import { CommonUpdateProgram } from "../common-update-ui";
import { Server } from "../constants";
import {
  mkdirp,
  humanFileSize,
  doStreamUnzip,
  removeFile,
  writeFile,
  readAllLines,
  hpatchz,
  forceMove,
} from "../utils";

export async function* updateGameProgram({
  aria2,
  updateFileZip,
  gameDir,
  currentGameVersion,
  updatedGameVersion,
  server,
}: {
  updateFileZip: string;
  gameDir: string;
  currentGameVersion: string;
  updatedGameVersion: string;
  aria2: Aria2;
  server: Server;
}): CommonUpdateProgram {
  const downloadTmp = join(gameDir, ".ariatmp");
  const updateFileTmp = join(downloadTmp, "update.zip");
  // const audioFileTmp = join(downloadTmp, "audio.zip");
  await mkdirp(downloadTmp);
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];
  let gameFileStart = false;
  for await (const progress of aria2.doStreamingDownload({
    uri: updateFileZip,
    absDst: updateFileTmp,
  })) {
    if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
      continue;
    }
    gameFileStart = true;
    yield [
      "setStateText",
      "DOWNLOADING_FILE_PROGRESS",
      basename(updateFileZip),
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
  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
  for await (const [dec, total] of doStreamUnzip(updateFileTmp, gameDir)) {
    yield ["setProgress", (dec / total) * 100];
  }
  await removeFile(updateFileTmp);

  yield ['setStateText','PATCHING'];
  // delete files
  const deleteList = (
    await readAllLines(join(gameDir, "deletefiles.txt"))
  ).filter((x) => x.trim() != "");

  const diffList: {
    remoteName: string;
  }[] = (await readAllLines(join(gameDir, "hdifffiles.txt")))
    .filter((x) => x.trim() != "")
    .map((x) => JSON.parse(x));

  const patchCount = deleteList.length + diffList.length;
  let doneCount = 0;

  for (const file of deleteList) {
    await removeFile(join(gameDir, file));
    doneCount++;
    yield ['setProgress', doneCount / patchCount * 100];
  }
  await removeFile(join(gameDir, "deletefiles.txt"));
  // diff files

  for (const { remoteName: file } of diffList) {
    await hpatchz(
      join(gameDir, file),
      join(gameDir, file + ".hdiff"),
      join(gameDir, file + ".patched")
    );
    await forceMove(join(gameDir, file + ".patched"), join(gameDir, file));
    await removeFile(join(gameDir, file + ".hdiff"));
    doneCount++;
    yield ['setProgress', doneCount / patchCount * 100];
  }
  await removeFile(join(gameDir, "hdifffiles.txt"));
  yield ['setUndeterminedProgress'];

  await writeFile(
    join(gameDir, "config.ini"),
    `[General]
game_version=${updatedGameVersion}
channel=${server.channel_id}
sub_channel=${server.subchannel_id}
cps=${server.cps}`
  );
}
