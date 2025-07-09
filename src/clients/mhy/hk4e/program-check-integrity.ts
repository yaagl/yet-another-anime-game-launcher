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
    repair_mode: "reliable",
  })

  yield [
    "setStateText",
    "SCANNING_FILES",
    "0",
    "0",
  ];

  for await (const progress of sophon.streamOperationProgress(taskId)) {
    switch (progress.type) {
      case "check_file":
        yield [
          "setStateText",
          "SCANNING_FILES",
          String(progress.overall_progress.checked_files),
          String(progress.overall_progress.total_files),
        ];
        yield ["setProgress", Number(progress.overall_progress.overall_percent)];
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

  // const entries: {
  //   remoteName: string;
  //   md5: string;
  //   fileSize: number;
  // }[] = (await readAllLines(join(gameDir, "pkg_version")))
  //   .filter(x => x.trim() != "")
  //   .map(x => JSON.parse(x));
  // const toFix: {
  //   remoteName: string;
  // }[] = [];
  // let count = 0;
  // yield [
  //   "setStateText",
  //   "SCANNING_FILES",
  //   String(count),
  //   String(entries.length),
  // ];
  // for (const entry of entries) {
  //   const localPath = join(gameDir, entry.remoteName);
  //   try {
  //     const fileStats = await stats(localPath);
  //     if (fileStats.size !== entry.fileSize) {
  //       throw new Error("Size not match");
  //     }
  //     const md5sum = await md5(localPath);
  //     if (md5sum.toLowerCase() !== entry.md5.toLowerCase()) {
  //       await log(`${md5sum} ${entry.md5} not match`);
  //       throw new Error("Md5 not match");
  //     }
  //   } catch {
  //     toFix.push(entry);
  //   }
  //   count++;
  //   yield [
  //     "setStateText",
  //     "SCANNING_FILES",
  //     String(count),
  //     String(entries.length),
  //   ];
  //   yield ["setProgress", (count / entries.length) * 100];
  // }
  // setKey("patched", null);
  // if (toFix.length == 0) {
  //   return;
  // }
  // count = 0;
  // for (const { remoteName } of toFix) {
  //   const localPath = join(gameDir, remoteName);
  //   const remotePath = join(remoteDir, remoteName).replace(":/", "://"); //....join: wtf?
  //   yield ["setUndeterminedProgress"];
  //   yield ["setStateText", "FIXING_FILES", String(count), String(toFix.length)];
  //   for await (const progress of aria2.doStreamingDownload({
  //     uri: remotePath,
  //     absDst: localPath,
  //   })) {
  //     yield [
  //       "setProgress",
  //       Number((progress.completedLength * BigInt(100)) / progress.totalLength),
  //     ];
  //   }
  //   count++;
  // }
}
