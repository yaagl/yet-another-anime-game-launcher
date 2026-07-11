import { join } from "path-browserify";
import { Config } from "@config";
import { CommonUpdateProgram } from "@common-update-ui";
import { mkdirp, removeFile, resolve, writeFile, log } from "@utils";
import { Wine } from "@wine";

export async function* launchGameProgram({
  gameDir,
  gameExecutable,
  wine,
  config,
}: {
  gameDir: string;
  gameExecutable: string;
  wine: Wine;
  config: Config;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "GAME_RUNNING"];

  await wine.setProps(config);

  const cmd = `@echo off
cd "%~dp0"
cd /d "${wine.toWinePath(gameDir)}"
"${wine.toWinePath(join(gameDir, gameExecutable))}"`;
  await writeFile(resolve("config.bat"), cmd);
  await mkdirp(resolve("./logs"));

  try {
    const logfile = resolve(`./logs/game_${Date.now()}.log`);
    const yaaglDir = resolve("./");
    await wine.exec2(
      "cmd",
      ["/c", `${wine.toWinePath(resolve("./config.bat"))}`],
      {
        MTL_HUD_ENABLED: config.metalHud ? "1" : "",
        ...(wine.attributes.renderBackend == "dxmt"
          ? {
              WINEMSYNC: "1",
              DXMT_LOG_PATH: yaaglDir,
              DXMT_CONFIG_FILE: join(yaaglDir, "dxmt.conf"),
            }
          : {
              WINEESYNC: "1",
            }),
        ...(config.proxyEnabled
          ? {
              HTTP_PROXY: config.proxyHost,
              HTTPS_PROXY: config.proxyHost,
            }
          : {}),
      },
      logfile
    );
    await wine.waitUntilServerOff();
  } catch (e: unknown) {
    await log(String(e));
  }

  await removeFile(resolve("config.bat"));
}
