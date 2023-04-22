import retina_on from "../../../constants/retina_on.reg?url";
import retina_off from "../../../constants/retina_off.reg?url";
import left_cmd_on from "../../../constants/left_cmd_on.reg?url";
import left_cmd_off from "../../../constants/left_cmd_off.reg?url";

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
${wine.toWinePath(join(gameDir, gameExecutable))}`;
  await writeFile(resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine.prefix, server, config);
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
          MVK_ALLOW_METAL_FENCES: "1",
          WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
          DXVK_ASYNC: config.dxvkAsync ? "1" : "",
          ...(config.dxvkHud == ""
            ? {}
            : {
                DXVK_HUD: config.dxvkHud,
              }),
          GIWINEHOSTS: `${server.hosts}`,
          DXVK_STATE_CACHE_PATH: yaaglDir,
          DXVK_LOG_PATH: yaaglDir,
          DXVK_CONFIG_FILE: join(yaaglDir, "dxvk.conf"),
        },
        logfile
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
  } catch (e: unknown) {
    // it seems game crashed?
    await log(String(e));
  }

  await removeFile(resolve("retina.reg"));
  await removeFile(resolve("left_cmd.reg"));
  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine.prefix, server, config);
}
