import { join } from "path-browserify";
import { CommonUpdateProgram } from "../common-update-ui";
import { Server } from "../constants";
import {
  writeBinary,
  forceMove,
  removeFile,
  log,
  readBinary,
  getKey,
  setKey,
} from "../utils";
import { xdelta3 } from "../utils/unix";

import d3d9u from "../../dxvk/d3d9.dll?url";
import d3d10coreu from "../../dxvk/d3d10core.dll?url";
import d3d11u from "../../dxvk/d3d11.dll?url";
import dxgiu from "../../dxvk/dxgi.dll?url";

export async function putLocal(url: string, dest: string) {
  return await writeBinary(dest, await (await fetch(url)).arrayBuffer());
}

const dxvkFiles = [
  {
    name: "dxgi",
    url: dxgiu,
  },
  {
    name: "d3d9",
    url: d3d9u,
  },
  {
    name: "d3d10core",
    url: d3d10coreu,
  },
  {
    name: "d3d11",
    url: d3d11u,
  },
];

export async function* patchProgram(
  gameDir: string,
  winprefixDir: string,
  server: Server
): CommonUpdateProgram {
  try {
    await getKey("patched");
    return;
  } catch {}
  for (const file of server.patched) {
    await forceMove(
      join(gameDir, file.file),
      join(gameDir, file.file + ".bak")
    );
    await putLocal(file.diffUrl, join(gameDir, file.file + ".diff"));
    await xdelta3(
      join(gameDir, file.file + ".bak"),
      join(gameDir, file.file + ".diff"),
      join(gameDir, file.file)
    );
    await log("patched " + file.file);
    await removeFile(join(gameDir, file.file + ".diff"));
  }
  for (const file of server.removed.map(atob)) {
    await forceMove(join(gameDir, file), join(gameDir, file + ".bak"));
  }
  await forceMove(
    join(gameDir, server.dataDir, "globalgamemanagers"),
    join(gameDir, server.dataDir, "globalgamemanagers.bak")
  );
  writeBinary(
    join(gameDir, server.dataDir, "globalgamemanagers"),
    await disableUnityFeature(
      join(gameDir, server.dataDir, "globalgamemanagers.bak")
    )
  );
  const system32Dir = join(winprefixDir, "drive_c", "windows", "system32");
  for (const f of dxvkFiles) {
    await forceMove(
      join(system32Dir, f.name + ".dll"),
      join(system32Dir, f.name + ".dll.bak")
    );
    await putLocal(f.url, join(system32Dir, f.name + ".dll"));
  }
  setKey("patched", "1");
}

export async function* patchRevertProgram(
  gameDir: string,
  winprefixDir: string,
  server: Server
): CommonUpdateProgram {
  try {
    await getKey("patched");
  } catch {
    return;
  }
  for (const file of server.patched) {
    await forceMove(
      join(gameDir, file.file + ".bak"),
      join(gameDir, file.file)
    );
  }
  for (const file of server.removed.map(atob)) {
    await forceMove(join(gameDir, file + ".bak"), join(gameDir, file));
  }
  await forceMove(
    join(gameDir, server.dataDir, "globalgamemanagers.bak"),
    join(gameDir, server.dataDir, "globalgamemanagers")
  );
  const system32Dir = join(winprefixDir, "drive_c", "windows", "system32");
  for (const f of dxvkFiles) {
    await forceMove(
      join(system32Dir, f.name + ".dll.bak"),
      join(system32Dir, f.name + ".dll")
    );
  }
  setKey("patched", null);
}

async function disableUnityFeature(ggmPath: string) {
  const view = new Uint8Array(await readBinary(ggmPath));
  const index = patternSearch(
    view,
    [
      0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67,
      0x6f, 0x72, 0x79, 0x2e,
    ]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    const len = index + 8;
    const v = new DataView(view.buffer);
    v.setInt32(len, 0, true);
    return view.buffer;
  }
}

export function patternSearch(view: Uint8Array, pattern: number[]) {
  retry: for (let i = 0; i < view.byteLength - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (view[i + j] != pattern[j]) continue retry;
    }
    return i + pattern.length;
  }
  return -1;
}
