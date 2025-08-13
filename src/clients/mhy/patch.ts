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
import { DXMT_FILES, DXVK_FILES } from "src/downloadable-resource";

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
  // FIXME: dirty hack
  if (
    wine.attributes.renderBackend == "dxvk" &&
    ["hkrpg_cn", "hkrpg_global"].indexOf(server.id) === -1
  ) {
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
  }
  const system32Dir = join(wine.prefix, "drive_c", "windows", "system32");
  const syswow64Dir = join(wine.prefix, "drive_c", "windows", "syswow64");
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
    await cp(
      `./dxmt/winemetal.dll`,
      resolve("./wine/lib/wine/x86_64-windows/winemetal.dll")
    );
    await cp(
      `./dxmt/winemetal.so`,
      resolve("./wine/lib/wine/x86_64-unix/winemetal.so")
    );
    if (server.id.startsWith("hkrpg")) {
      await cp(
        `./dxmt/nvngx.dll`,
        resolve("./wine/lib/wine/x86_64-windows/nvngx.dll")
      );
      await cp(`./dxmt/nvngx.dll`, join(system32Dir, "nvngx.dll"));
    }
  }
  if (config.reshade) {
    await cp(resolve("./reshade/dxgi.dll"), join(gameDir, "dxgi.dll"));
    await cp(
      resolve("./reshade/d3dcompiler_47.dll"),
      join(gameDir, "d3dcompiler_47.dll")
    );
  }

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
  // FIXME: dirty hack
  if (
    wine.attributes.renderBackend == "dxvk" &&
    ["hkrpg_cn", "hkrpg_global"].indexOf(server.id) === -1
  ) {
    await forceMove(
      join(gameDir, server.dataDir, "globalgamemanagers.bak"),
      join(gameDir, server.dataDir, "globalgamemanagers")
    );
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
