import { join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "../server";
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
import {
  patchProgram,
  patchRevertProgram,
  putLocal,
} from "./program-patch-game";

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
"${wine.toWinePath(
    join(gameDir, gameExecutable),
  )}" -FeatureLevelES31 -ChannelID=${server.channel}`;
  await writeFile(resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine, config);
  await mkdirp(resolve("./logs"));
  try {
    yield ["setStateText", "GAME_RUNNING"];
    const logfile = resolve(`./logs/game_${Date.now()}.log`);
    const yaaglDir = resolve("./");
    await wine.exec2(
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
              MVK_ALLOW_METAL_FENCES: "1",
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
    );
    await wine.waitUntilServerOff();
  } catch (e: unknown) {
    // it seems game crashed?
    await log(String(e));
  }

  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine, config);
}
