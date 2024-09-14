import { dirname, join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  writeBinary,
  forceMove,
  removeFile,
  log,
  getKey,
  setKey,
  cp,
  resolve,
  removeFileIfExists,
  fileOrDirExists,
  getKeyOrDefault,
  mkdirp,
  xdelta3,
} from "@utils";
import { Config } from "@config";
import { Wine } from "@wine";
import { DXMT_FILES, DXVK_FILES } from "src/downloadable-resource";

export async function putLocal(url: string, dest: string) {
  return await writeBinary(dest, await (await fetch(url)).arrayBuffer());
}

export async function* patchProgram(
  gameDir: string,
  wine: Wine,
  config: Config,
): CommonUpdateProgram {
  if ((await getKeyOrDefault("patched", "NOTFOUND")) != "NOTFOUND") {
    return;
  }
  const system32Dir = join(wine.prefix, "drive_c", "windows", "system32");
  if (wine.attributes.renderBackend == "dxvk") {
    for (const f of DXVK_FILES) {
      await forceMove(join(system32Dir, f), join(system32Dir, f + ".bak"));
      await cp(`./dxvk/${f}`, join(system32Dir, f));
    }
  }
  if (wine.attributes.renderBackend == "dxmt") {
    for (const f of DXMT_FILES) {
      await forceMove(join(system32Dir, f), join(system32Dir, f + ".bak"));
      await cp(`./dxmt/${f}`, join(system32Dir, f));
    }
  }
  if (config.reshade) {
    await cp(resolve("./reshade/dxgi.dll"), join(gameDir, "dxgi.dll"));
    await cp(
      resolve("./reshade/d3dcompiler_47.dll"),
      join(gameDir, "d3dcompiler_47.dll"),
    );
  }
  setKey("patched", "1");
}

export async function* patchRevertProgram(
  gameDir: string,
  wine: Wine,
  config: Config,
): CommonUpdateProgram {
  try {
    await getKey("patched");
  } catch {
    return;
  }
  const system32Dir = join(wine.prefix, "drive_c", "windows", "system32");
  if (wine.attributes.renderBackend == "dxvk") {
    for (const f of DXVK_FILES) {
      await forceMove(join(system32Dir, f + ".bak"), join(system32Dir, f));
    }
  }
  if (wine.attributes.renderBackend == "dxmt") {
    for (const f of DXMT_FILES) {
      await forceMove(join(system32Dir, f + ".bak"), join(system32Dir, f));
    }
  }
  if (config.reshade) {
    await removeFileIfExists(join(gameDir, "dxgi.dll"));
    await removeFileIfExists(join(gameDir, "d3dcompiler_47.dll"));
  }
  setKey("patched", null);
}
