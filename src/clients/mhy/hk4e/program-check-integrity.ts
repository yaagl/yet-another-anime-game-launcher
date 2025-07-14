import { basename, join } from "path-browserify";
import { Sophon } from "@sophon";
import { CommonUpdateProgram } from "@common-update-ui";
import { log, md5, stats, readAllLines, setKey, humanFileSize } from "@utils";

export async function* checkIntegrityProgram({
  sophon,
  gameDir,
}: {
  gameDir: string;
  sophon: Sophon;
}): CommonUpdateProgram {
  const taskId = await sophon.startRepair({
    gamedir: gameDir,
    game_type: "hk4e",
    repair_mode: "reliable",
  });

  yield ["setStateText", "SCANNING_FILES", "0", "0"];

  for await (const progress of sophon.streamOperationProgress(taskId)) {
    switch (progress.type) {
      case "check_file":
        yield [
          "setStateText",
          "SCANNING_FILES",
          String(progress.overall_progress.checked_files),
          String(progress.overall_progress.total_files),
        ];
        yield [
          "setProgress",
          Number(progress.overall_progress.overall_percent),
        ];
        break;

      case "chunk_progress":
        log(`Chunk progress: ${progress.chunk_size} bytes downloaded`);
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

      default:
        break;
    }
  }
}
