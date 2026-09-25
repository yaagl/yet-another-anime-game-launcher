import { join, basename } from "path-browserify";
import { Sophon } from "@sophon";
import { CommonUpdateProgram } from "@common-update-ui";
import { humanFileSize, setKey } from "@utils";

async function* streamProgress(
  sophon: Sophon,
  taskId: string,
  withPatching: boolean
): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];
  for await (const progress of sophon.streamOperationProgress(taskId)) {
    switch (progress.type) {
      case "delete_file":
      case "delete_ldiff_file":
        if (!withPatching) break;
        yield ["setStateText", "PATCHING"];
        yield [
          "setProgress",
          Number(progress.overall_progress.overall_percent),
        ];
        break;

      case "ldiff_download_complete":
      case "chunk_progress":
        yield [
          "setStateText",
          "DOWNLOADING_FILE_PROGRESS",
          basename(progress.filename),
          humanFileSize(progress.overall_progress.download_speed),
          humanFileSize(progress.overall_progress.downloaded_size),
          humanFileSize(progress.overall_progress.total_size),
        ];
        yield [
          "setProgress",
          Number(progress.overall_progress.overall_percent),
        ];
        break;
    }
  }
  yield ["setUndeterminedProgress"];
}

export async function* updateGameProgram({
  sophon,
  gameDir,
}: {
  sophon: Sophon;
  gameDir: string;
}): CommonUpdateProgram {
  yield ["setStateText", "UPDATING"];
  const taskId = await sophon.startUpdate({
    gamedir: gameDir,
    game_type: "hkrpg",
    tempdir: join(gameDir, ".tmp"),
    predownload: false,
  });
  yield* streamProgress(sophon, taskId, true);
  await setKey(`predownloaded_all`, null);
  // config.ini is written by the sophon server
}

export async function* predownloadGameProgram({
  sophon,
  gameDir,
}: {
  sophon: Sophon;
  gameDir: string;
}): CommonUpdateProgram {
  const taskId = await sophon.startUpdate({
    gamedir: gameDir,
    game_type: "hkrpg",
    tempdir: join(gameDir, ".tmp"),
    predownload: true,
  });
  yield* streamProgress(sophon, taskId, false);
  await setKey(`predownloaded_all`, "true");
}
