import { join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import {
  mkdirp,
  removeFile,
  writeFile,
  resolve,
  log,
  wait,
  forceMove,
  stats,
  exec,
} from "@utils";
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

  await wine.setProps(config);

  const cmd = `@echo off
cd "%~dp0"
cd /d "${wine.toWinePath(gameDir)}"
"${wine.toWinePath(resolve("./jadeite/jadeite.exe"))}" "${wine.toWinePath(
    join(gameDir, gameExecutable),
  )}"`;
  await writeFile(resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine, server, config);
  await mkdirp(resolve("./logs"));
  try {
    yield ["setStateText", "GAME_RUNNING"];
    const logfile = resolve(`./logs/game_${Date.now()}.log`);
    const yaaglDir = resolve("./");
    await Promise.all([
      wine.exec2(
        "cmd",
        ["/c", `${wine.toWinePath(resolve("./config.bat"))}`],
        {
          MTL_HUD_ENABLED: config.metalHud ? "1" : "",
          MVK_ALLOW_METAL_FENCES: "1",
          WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
          ...(wine.attributes.renderBackend == "dxvk"
            ? {
                DXVK_ASYNC: config.dxvkAsync ? "1" : "",
                ...(config.dxvkHud == ""
                  ? {}
                  : {
                      DXVK_HUD: config.dxvkHud,
                    }),
                DXVK_STATE_CACHE_PATH: yaaglDir,
                DXVK_LOG_PATH: yaaglDir,
                DXVK_CONFIG_FILE: join(yaaglDir, "dxvk.conf"),
              }
            : {}),
          ...(wine.attributes.renderBackend == "dxmt"
            ? {
                WINEMSYNC: "1",
                DXMT_LOG_PATH: yaaglDir,
                DXMT_CONFIG: "d3d11.preferredMaxFrameRate=60;",
                DXMT_CONFIG_FILE: join(yaaglDir, "dxmt.conf"),
                GST_PLUGIN_FEATURE_RANK: "atdec:MAX,avdec_h264:MAX",
              }
            : {
                WINEESYNC: "1",
              }),
        },
        logfile,
      ),
      (async () => {
        // while (processRunning) {
        //   if ((await exec("cat",[logfile])).stdOut.includes("GCGMAH active")) {
        //     await log("Game Launch Successful");
        //     await forceMove(
        //       join(gameDir, atob("bWh5cGJhc2UuZGxs") + ".bak"),
        //       join(gameDir, atob("bWh5cGJhc2UuZGxs"))
        //     );
        //     break;
        //   }
        //   await wait(200);
        // }
      })(),
    ]);
    await wine.waitUntilServerOff();
  } catch (e: unknown) {
    // it seems game crashed?
    await log(String(e));
  }

  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine, server, config);
}
