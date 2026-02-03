import {
  exec,
  log,
  spawn,
  timeout,
  resolve,
  appendFile,
  addTerminationHook,
  GLOBAL_onClose,
  setKey,
  exit,
  rawString,
  withTimeout,
  initializeBasePath,
} from "./utils";
import { logError, logInfo } from "./utils/structured-logging";
import { getTimeout } from "./config/timeouts";
import { createAria2Retry } from "./aria2";
import {
  checkWine,
  createWine,
  createWineInstallProgram,
  getCorrectWineBinary,
} from "./wine";
import { createGithubEndpoint } from "./github";
import { createLauncher } from "./launcher";
import "./app.css";
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";
import { createLocale } from "./locale";
import { createClient } from "./clients";

export async function createApp() {
  // Initialize base path (standard Neutralino 2026 approach)
  // In dev mode (neu run --path=./yaaglwdos), we need pwd-based resolution
  // In prod mode (packaged .app), we use NL_PATH
  await initializeBasePath();

  await setKey("singleton", null);

  const aria2_port = 6868;

  await Neutralino.events.on("windowClose", async () => {
    if (await GLOBAL_onClose(false)) {
      exit(0);
    }
  });

  const locale = await createLocale();
  const github = await createGithubEndpoint();

  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];

  // Build aria2c command arguments
  const aria2cArgs = [
    resolve("./sidecar/aria2/aria2c"),
    "-d",
    "/",
    "--no-conf",
    "--enable-rpc",
    `--rpc-listen-port=${aria2_port}`,
    "--rpc-listen-all=true",
    "--rpc-allow-origin-all",
    "--pause=true",
    `--stop-with-process=${pid}`,
  ];

  const { pid: apid } = await spawn(aria2cArgs);
  addTerminationHook(async () => {
    // double insurance (esp. for self restart)
    await log("killing process " + apid);
    try {
      await exec(["kill", apid + ""]);
    } catch (error) {
      await logError("Failed to kill aria2 process", error, { pid: apid });
    }
    return true;
  });

  // Use withTimeout with proper error handling
  const aria2 = await withTimeout(
    createAria2Retry({ host: "127.0.0.1", port: aria2_port }),
    getTimeout("ARIA2_LAUNCH")
  ).catch(error => {
    throw new Error(
      `Failed to launch aria2: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error }
    );
  });

  await logInfo(`Launched aria2`, { version: aria2.version.version });

  const { latest, downloadUrl, sidecarDownloadUrl, description, version } =
    await createUpdater({
      github,
      aria2,
    });
  if (latest == false) {
    if (
      await locale.prompt(
        "NEW_VERSION_AVALIABLE",
        "NEW_VERSION_AVALIABLE_DESC",
        [version, description]
      )
    ) {
      return createCommonUpdateUI(locale, () =>
        downloadProgram(aria2, downloadUrl, sidecarDownloadUrl)
      );
    }
  }

  const wineStatus = await checkWine(github);
  
  // Use standard resolve() for wineprefix path
  const prefixPath = resolve("./wineprefix");

  if (wineStatus.wineReady) {
    const wine = await createWine({
      prefix: prefixPath,
      distro: wineStatus.wineDistribution,
    });
    return await createLauncher({
      wine,
      locale,
      github,
      channelClient: await createClient({
        wine,
        aria2,
        locale,
      }),
    });
  } else {
    return await createWineInstallProgram({
      aria2,
      wineAbsPrefix: prefixPath,
      wineDistro: wineStatus.wineDistribution,
      locale,
    });
  }
}
