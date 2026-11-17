import { gt } from "semver";
import { dirname, join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
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
import { disableUnityFeature } from "./unity";
import { Wine } from "@wine";
import { DXMT_FILES, getDXMTArchitecture } from "src/downloadable-resource";

export async function putLocal(url: string, dest: string) {
  return await writeBinary(dest, await (await fetch(url)).arrayBuffer());
}

export async function* patchProgram(
  gameDir: string,
  wine: Wine,
  server: Server,
  config: Config
): CommonUpdateProgram {
  if ((await getKeyOrDefault("patched", "NOTFOUND")) != "NOTFOUND") {
    return;
  }
  if (!config.patchOff) {
    for (const file of server.patched) {
      if (file.tag === "workaround3" && config.workaround3) continue;
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
    for (const { file, tag } of server.removed) {
      if (tag === "workaround3" && config.workaround3) continue;
      if (await fileOrDirExists(join(gameDir, file))) {
        await forceMove(join(gameDir, file), join(gameDir, file + ".bak"));
      }
    }
    for (const file of server.added) {
      await mkdirp(join(gameDir, dirname(file.file)));
      await putLocal(file.url, join(gameDir, file.file));
    }
  }

  const system32Dir = join(wine.prefix, "drive_c", "windows", "system32");
  const syswow64Dir = join(wine.prefix, "drive_c", "windows", "syswow64");

  if (wine.attributes.renderBackend == "dxmt") {
    const architecture = getDXMTArchitecture(wine);
    const windowsDir = `./dxmt/${architecture}-windows`;
    for (const f of DXMT_FILES) {
      const wineLibPath = resolve(
        `./wine/lib/wine/${architecture}-windows/${f}`
      );
      await forceMove(wineLibPath, wineLibPath + ".bak");
      await cp(join(windowsDir, f), wineLibPath);
    }

    // winemetal files always go to Wine lib directories
    await cp(
      join(windowsDir, "winemetal.dll"),
      resolve(`./wine/lib/wine/${architecture}-windows/winemetal.dll`)
    );

    await cp(
      `./dxmt/${architecture}-unix/winemetal.so`,
      resolve(`./wine/lib/wine/${architecture}-unix/winemetal.so`)
    );

    // winemetal.dll also to system32 for both native and builtin
    await cp(
      join(windowsDir, "winemetal.dll"),
      join(system32Dir, "winemetal.dll")
    );

    if (server.id.startsWith("hkrpg")) {
      for (const file of architecture === "aarch64"
        ? ["nvngx.dll", "nvapi64.dll"]
        : ["nvngx.dll"]) {
        await cp(
          join(windowsDir, file),
          resolve(`./wine/lib/wine/${architecture}-windows/${file}`)
        );
        await cp(join(windowsDir, file), join(system32Dir, file));
      }
    }
  }

  if (config.reshade && wine.attributes.renderBackend == "dxmt") {
    await cp(resolve("./reshade/dxgi.dll"), join(gameDir, "dxgi.dll"));
    await cp(
      resolve("./reshade/d3dcompiler_47.dll"),
      join(gameDir, "d3dcompiler_47.dll")
    );
  }

  if (!server.id.startsWith("hkrpg")) {
    await cp(
      resolve("./sidecar/protonextras/steam64.exe"),
      join(system32Dir, "steam.exe")
    );
    await cp(
      resolve("./sidecar/protonextras/steam32.exe"),
      join(syswow64Dir, "steam.exe")
    );
    await cp(
      resolve("./sidecar/protonextras/lsteamclient64.dll"),
      join(system32Dir, "lsteamclient.dll")
    );
    await cp(
      resolve("./sidecar/protonextras/lsteamclient32.dll"),
      join(syswow64Dir, "lsteamclient.dll")
    );
  }

  setKey("patched", "1");
}

export async function* patchRevertProgram(
  gameDir: string,
  wine: Wine,
  server: Server,
  config: Config
): CommonUpdateProgram {
  try {
    await getKey("patched");
  } catch {
    return;
  }
  if (!config.patchOff) {
    for (const file of server.patched) {
      if (await fileOrDirExists(join(gameDir, file.file + ".bak"))) {
        await forceMove(
          join(gameDir, file.file + ".bak"),
          join(gameDir, file.file)
        );
      }
    }
    for (const { file } of server.removed) {
      if (await fileOrDirExists(join(gameDir, file + ".bak"))) {
        await forceMove(join(gameDir, file + ".bak"), join(gameDir, file));
      }
    }
    for (const file of server.added) {
      if (await fileOrDirExists(join(gameDir, file.file))) {
        await removeFile(join(gameDir, file.file));
      }
    }
  }

  const system32Dir = join(wine.prefix, "drive_c", "windows", "system32");
  if (wine.attributes.renderBackend == "dxmt") {
    const architecture = getDXMTArchitecture(wine);
    for (const f of DXMT_FILES) {
      const wineLibPath = resolve(
        `./wine/lib/wine/${architecture}-windows/${f}`
      );
      await forceMove(wineLibPath + ".bak", wineLibPath);
    }
  }
  if (config.reshade && wine.attributes.renderBackend == "dxmt") {
    await removeFileIfExists(join(gameDir, "dxgi.dll"));
    await removeFileIfExists(join(gameDir, "d3dcompiler_47.dll"));
  }
  setKey("patched", null);
}
