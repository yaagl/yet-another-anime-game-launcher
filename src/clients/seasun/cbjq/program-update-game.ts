import { join } from "path-browserify";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import { readFile, setKey, removeFileIfExists, writeFile } from "@utils";
import { LauncherResourceData } from "./launcher-info";
import { Server } from "../server";

export async function* updateGameProgram({
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
  yield ["setUndeterminedProgress"];
  const local_manifest = join(gameDir, "manifest.json");
  const localResourceData: LauncherResourceData = await readFile(
    local_manifest,
  ).then(
    content => {
      return JSON.parse(content);
    },
    () => {
      return { ...resourceData, paks: [] };
    },
  );
  const normalizePaks = (data: LauncherResourceData) =>
    data.paks.map(p => [p.hash, p] as const);
  type Pak = LauncherResourceData["paks"][number];
  const localPaks = new Map<string, Pak>(normalizePaks(localResourceData));
  const remotePaks = new Map<string, Pak>(normalizePaks(resourceData));

  const toAdd: {
    remoteName: string;
    hash: string;
  }[] = [];
  const toRemove: {
    localName: string;
  }[] = [];
  for (const [hash, localPak] of localPaks) {
    if (!remotePaks.has(hash)) {
      toRemove.push({ localName: localPak.name });
    }
  }
  for (const [hash, remotePak] of remotePaks) {
    if (!localPaks.has(hash)) {
      toAdd.push({ remoteName: remotePak.name, hash });
    }
  }
  for (const { localName } of toRemove) {
    const localPath = join(gameDir, localName);
    await removeFileIfExists(localPath);
  }
  let count = 0;
  for (const { remoteName, hash } of toAdd) {
    const localPath = join(gameDir, remoteName);
    const remotePath = join(server.dlc, resourceData.pathOffset, hash).replace(
      ":/",
      "://",
    ); //....join: wtf?
    yield ["setUndeterminedProgress"];
    yield ["setStateText", "FIXING_FILES", String(count), String(toAdd.length)];
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
  setKey("patched", null);

  await writeFile(join(gameDir, "manifest.json"), JSON.stringify(resourceData));
}
