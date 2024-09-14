import { join } from "path-browserify";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import { log, md5, stats, readAllLines, setKey } from "@utils";
import { LauncherResourceData } from "./launcher-info";
import { Server } from "../server";

export async function* checkIntegrityProgram({
  resourceData,
  gameDir,
  server,
  aria2,
}: {
  resourceData: LauncherResourceData;
  gameDir: string;
  server: Server;
  aria2: Aria2;
}): CommonUpdateProgram {
  const entries: {
    remoteName: string;
    md5: string;
    fileSize: number;
  }[] = resourceData.paks.map(x => ({
    remoteName: x.name,
    md5: x.hash,
    fileSize: x.sizeInBytes,
  }));
  const toFix: {
    remoteName: string;
    md5: string;
  }[] = [];
  let count = 0;
  yield [
    "setStateText",
    "SCANNING_FILES",
    String(count),
    String(entries.length),
  ];
  for (const entry of entries) {
    const localPath = join(gameDir, entry.remoteName);
    try {
      const fileStats = await stats(localPath);
      if (fileStats.size !== entry.fileSize) {
        throw new Error("Size not match");
      }
      const md5sum = await md5(localPath);
      if (md5sum.toLowerCase() !== entry.md5.toLowerCase()) {
        await log(`${md5sum} ${entry.md5} not match`);
        throw new Error("Md5 not match");
      }
    } catch {
      toFix.push(entry);
    }
    count++;
    yield [
      "setStateText",
      "SCANNING_FILES",
      String(count),
      String(entries.length),
    ];
    yield ["setProgress", (count / entries.length) * 100];
  }
  setKey("patched", null);
  if (toFix.length == 0) {
    return;
  }
  count = 0;
  for (const { remoteName, md5 } of toFix) {
    const localPath = join(gameDir, remoteName);
    const remotePath = join(server.dlc, resourceData.pathOffset, md5).replace(
      ":/",
      "://",
    ); //....join: wtf?
    yield ["setUndeterminedProgress"];
    yield ["setStateText", "FIXING_FILES", String(count), String(toFix.length)];
    for await (const progress of aria2.doStreamingDownload({
      uri: remotePath,
      absDst: localPath,
    })) {
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(100)) / progress.totalLength),
      ];
    }
    count++;
  }
}
