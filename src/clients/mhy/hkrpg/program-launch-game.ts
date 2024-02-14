import retina_on from "../../../constants/retina_on.reg?url";
import retina_off from "../../../constants/retina_off.reg?url";
import left_cmd_on from "../../../constants/left_cmd_on.reg?url";
import left_cmd_off from "../../../constants/left_cmd_off.reg?url";

import { join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import { mkdirp, removeFile, writeFile, resolve, log } from "@utils";
import { Wine } from "@wine";
import { Config } from "@config";
import { putLocal, patchProgram, patchRevertProgram } from "../patch";

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
  config: Config;
  server: Server;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "PATCHING"];

  if (config.retina) {
    await putLocal(retina_on, resolve("retina.reg"));
  } else {
    await putLocal(retina_off, resolve("retina.reg"));
  }

  if (config.leftCmd) {
    await putLocal(left_cmd_on, resolve("left_cmd.reg"));
  } else {
    await putLocal(left_cmd_off, resolve("left_cmd.reg"));
  }

  const cmd = `@echo off
cd "%~dp0"
regedit retina.reg
regedit left_cmd.reg
cd /d "${wine.toWinePath(gameDir)}"
"${wine.toWinePath(resolve("./jadeite/jadeite.exe"))}" "${wine.toWinePath(
    join(gameDir, gameExecutable)
  )}" -- -disable-gpu-skinning`;
  await writeFile(resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine, server, config);
  await mkdirp(resolve("./logs"));
  const yaaglDir = resolve("./");
  try {
    yield ["setStateText", "GAME_RUNNING"];
    const logfile = resolve(`./logs/game_${Date.now()}.log`);
    await wine.exec2(
      "cmd",
      ["/c", `${wine.toWinePath(resolve("./config.bat"))}`],
      {
        MTL_HUD_ENABLED: config.metalHud ? "1" : "",
        ...(wine.attributes.isGamePortingToolkit
          ? {}
          : {
              WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
              DXVK_ASYNC: config.dxvkAsync ? "1" : "",
              ...(config.dxvkHud == ""
                ? {}
                : {
                    DXVK_HUD: config.dxvkHud,
                  }),
              DXVK_STATE_CACHE_PATH: yaaglDir,
              DXVK_LOG_PATH: yaaglDir,
              DXVK_CONFIG_FILE: join(yaaglDir, "dxvk.conf"),
            }),
        GIWINEHOSTS: `${server.hosts}`,
      },
      logfile
    );
    await wine.waitUntilServerOff();
  } catch (e: unknown) {
    // it seems game crashed?
    await log(String(e));
  }

  await removeFile(resolve("retina.reg"));
  await removeFile(resolve("left_cmd.reg"));
  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine, server, config);
}
