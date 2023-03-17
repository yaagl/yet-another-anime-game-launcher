import a from "../../external/bWh5cHJvdDJfcnVubmluZy5yZWcK.reg?url";
import retina_on from "../constants/retina_on.reg?url";
import retina_off from "../constants/retina_off.reg?url";

import { join } from "path-browserify";
import { CommonUpdateProgram } from "../common-update-ui";
import { Server } from "../constants";
import { mkdirp, removeFile, writeFile, resolve, log } from "../utils";
import { Wine } from "../wine";
import { LauncherConfiguration } from "./config";
import { putLocal, patchProgram, patchRevertProgram } from "./patch";

export async function* launchGameProgram({
  gameDir,
  gameExecutable,
  wine,
  config,
  server,
}: {
  gameDir: string;
  gameExecutable: string;
  wine: Wine;
  config: LauncherConfiguration;
  server: Server;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "PATCHING"];

  await putLocal(a, await resolve("bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"));
  if (config.retina) {
    await putLocal(retina_on, await resolve("retina.reg"));
  } else {
    await putLocal(retina_off, await resolve("retina.reg"));
  }
  const cmd = `@echo off
cd "%~dp0"
regedit bWh5cHJvdDJfcnVubmluZy5yZWcK.reg
copy "${wine.toWinePath(join(gameDir, atob("bWh5cHJvdDMuc3lz")))}" "%TEMP%\\"
copy "${wine.toWinePath(
    join(gameDir, atob("SG9Zb0tQcm90ZWN0LnN5cw=="))
  )}" "%WINDIR%\\system32\\"
regedit retina.reg
"${wine.toWinePath(join(gameDir, gameExecutable))}"`;
  await writeFile(await resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine.prefix, server);
  await mkdirp(await resolve("./logs"));
  try {
    yield ["setStateText", "GAME_RUNNING"];
    await wine.exec(
      "cmd",
      ["/c", `"${wine.toWinePath(await resolve("config.bat"))}"`],
      {
        WINEESYNC: "1",
        WINEDEBUG: "-all",
        DXVK_HUD: config.dxvkHud,
        MVK_ALLOW_METAL_FENCES: "1",
        WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
        DXVK_ASYNC: config.dxvkAsync ? "1" : "",
      },
      `logs/game_${Date.now()}.log`
    );
    await removeFile(await resolve("bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"));
    await removeFile(await resolve("retina.reg"));
    await removeFile(await resolve("config.bat"));
  } catch (e: any) {
    // it seems game crashed?
    await log(String(e));
  }

  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine.prefix, server);
}
