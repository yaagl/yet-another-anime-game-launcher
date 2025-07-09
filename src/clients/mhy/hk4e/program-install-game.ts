import { join, basename } from "path-browserify";
import { SophonClient } from "@sophon";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import { humanFileSize, log } from "@utils";

export async function* downloadAndInstallGameProgram({
                                                       sophonClient,
                                                       gameDir,
                                                       installReltype = "os",
                                                     }: {
  sophonClient: SophonClient;
  gameDir: string;
  installReltype?: string;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  log("Starting game installation process...");

  const taskId = await sophonClient.startInstallation({
    gamedir: gameDir,
    install_reltype: installReltype,
  })
  log (`Installation task started with ID: ${taskId}`);

    for await (const progress of sophonClient.streamOperationProgress(taskId)) {
    switch (progress.type) {
      case "job_start":
        yield ["setUndeterminedProgress"];
        yield ["setStateText", "ALLOCATING_FILE"];
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
