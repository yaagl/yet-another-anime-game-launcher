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
  hpatchz,
  forceMove,
  readAllLinesIfExists,
  removeFileIfExists,
  getKey,
  stats,
  setKey,
  exec,
  getKeyOrDefault,
  fileOrDirExists,
  extract7z,
} from "@utils";
import { gte } from "semver";

//https://stackoverflow.com/a/69399958
const sha1sum = async (message: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
  return hashHex;
};

async function* downloadAndPatch(
  updateFileZip: string,
  gameDir: string,
  aria2: Aria2
): CommonUpdateProgram {
  const downloadTmp = join(gameDir, ".ariatmp");
  await mkdirp(downloadTmp);
  const updateFileTmp = join(downloadTmp, basename(updateFileZip));

  try {
    await getKey(
      `predownloaded_${(await sha1sum(basename(updateFileZip))).slice(0, 32)}`
    );
    await stats(updateFileTmp);
  } catch {
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
  } finally {
    await setKey(
      `predownloaded_${(await sha1sum(basename(updateFileZip))).slice(0, 32)}`,
      null
    );
  }

  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
  yield ["setUndeterminedProgress"];
  await extract7z(updateFileTmp, gameDir);
  await removeFile(updateFileTmp);

  yield ["setStateText", "PATCHING"];
  // delete files
  const deleteList = (
    await readAllLinesIfExists(join(gameDir, "deletefiles.txt"))
  ).filter(x => x.trim() != "");

  async function readJsonIfExists(filePath: string): Promise<any> {
    try {
      const content = await readAllLinesIfExists(filePath);
      return JSON.parse(content.join("\n"));
    } catch (error) {
      return { diff_map: [] };
    }
  }
  const diffList: {
    sourceFile: string;
    targetFile: string;
    patchFile: string;
  }[] = (await readJsonIfExists(join(gameDir, "hdiffmap.json"))).diff_map.map(
    (entry: any) => ({
      sourceFile: entry.source_file_name,
      targetFile: entry.target_file_name,
      patchFile: entry.patch_file_name,
    })
  );

  const patchCount = deleteList.length + diffList.length;
  let doneCount = 0;

  for (const file of deleteList) {
    await removeFile(join(gameDir, file));
    doneCount++;
    yield ["setProgress", (doneCount / patchCount) * 100];
  }
  await removeFileIfExists(join(gameDir, "deletefiles.txt"));
  // diff files

  for (const { sourceFile, patchFile, targetFile } of diffList) {
    await hpatchz(
      join(gameDir, sourceFile),
      join(gameDir, patchFile),
      join(gameDir, targetFile)
    );
    // await forceMove(join(gameDir, sourceFile), join(gameDir,targetFile));
    await removeFile(join(gameDir, patchFile));
    doneCount++;
    yield ["setProgress", (doneCount / patchCount) * 100];
  }
  await removeFileIfExists(join(gameDir, "hdiffmap.json"));
  yield ["setUndeterminedProgress"];
}

export async function* updateGameProgram({
  aria2,
  updateFileZip,
  gameDir,
  currentGameVersion,
  updatedGameVersion,
  server,
  updateVoicePackZips,
}: {
  updateFileZip: string;
  gameDir: string;
  currentGameVersion: string;
  updatedGameVersion: string;
  aria2: Aria2;
  server: Server;
  updateVoicePackZips: string[];
}): CommonUpdateProgram {
  yield ["setStateText", "UPDATING"];

  yield* downloadAndPatch(updateFileZip, gameDir, aria2);

  for (const updateVoicePackZip of updateVoicePackZips) {
    yield* downloadAndPatch(updateVoicePackZip, gameDir, aria2);
  }

  await setKey(`predownloaded_all`, null);
  await writeFile(
    join(gameDir, "config.ini"),
    `[General]
game_version=${updatedGameVersion}
channel=${server.channel_id}
sub_channel=${server.subchannel_id}
cps=${server.cps}`
  );
}

async function* predownload(
  updateFileZip: string,
  gameDir: string,
  aria2: Aria2
): CommonUpdateProgram {
  const downloadTmp = join(gameDir, ".ariatmp");
  await mkdirp(downloadTmp);
  const updateFileTmp = join(downloadTmp, basename(updateFileZip));

  if (
    (await getKeyOrDefault(
      `predownloaded_${(await sha1sum(basename(updateFileZip))).slice(0, 32)}`,
      `NOTFOUND`
    )) !== "NOTFOUND"
  ) {
    return;
  }

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
  await setKey(
    `predownloaded_${(await sha1sum(basename(updateFileZip))).slice(0, 32)}`,
    "true"
  );
}

export async function* predownloadGameProgram({
  gameDir,
  updateFileZip,
  aria2,
  updateVoicePackZips,
}: {
  updateFileZip: string;
  gameDir: string;
  aria2: Aria2;
  updateVoicePackZips: string[];
}) {
  yield* predownload(updateFileZip, gameDir, aria2);

  for (const updateVoicePackZip of updateVoicePackZips) {
    yield* predownload(updateVoicePackZip, gameDir, aria2);
  }
  await setKey(`predownloaded_all`, "true");
}
