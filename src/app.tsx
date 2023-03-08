import {
  exec,
  log,
  spawn,
  timeout,
  wait,
  resolve,
  appendFile,
  prompt,
  addTerminationHook,
  GLOBAL_onClose,
  getKey,
  setKey,
  alert,
} from "./utils";
import { createAria2 } from "./aria2";
import { checkWine, createWine, createWineInstallProgram } from "./wine";
import { createGithubEndpoint } from "./github";
import { createLauncher } from "./launcher";
import "./app.css";
import { CURRENT_YAAGL_VERSION } from "./constants";
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";
import { createLocale } from "./locale";
import zh_CN from "./locale/zh_CN";

export async function createApp() {
  await setKey("singleton", null);

  let aria2_port = 6868;

  await Neutralino.events.on("ready", async () => {});
  await Neutralino.events.on("windowClose", async () => {
    if (await GLOBAL_onClose(false)) {
      Neutralino.app.exit(0);
    }
  });

  const locale = createLocale(zh_CN);
  const github = await createGithubEndpoint();
  const aria2_session = await resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = (await exec("echo", ["$PPID"])).stdOut.split("\n")[0];
  const { pid: apid } = await spawn("./sidecar/aria2/aria2c", [
    // "-q",
    "-d",
    "/",
    "--no-conf",
    "--enable-rpc",
    `--rpc-listen-port=${aria2_port}`,
    `--rpc-listen-all=true`,
    `--rpc-allow-origin-all`,
    // `-c`,
    `--input-file`,
    `"${aria2_session}"`,
    `--save-session`,
    `"${aria2_session}"`,
    `--pause`,
    `true`,
    "--stop-with-process",
    pid,
  ]);
  addTerminationHook(async () => {
    // double insurance (esp. for self restart)
    await log("killing process " + apid);
    await exec("kill", [apid + ""]);
    return true;
  });
  const aria2 = await Promise.race([
    createAria2({ host: "127.0.0.1", port: aria2_port }),
    timeout(10000),
  ]).catch(() => Promise.reject(new Error("Fail to launch aria2.")));
  await log(`Launched aria2 version ${aria2.version.version}`);

  const { latest, downloadUrl, description, version } = await createUpdater({
    github,
    aria2,
  });
  if (!latest) {
    if (
      await locale.prompt(
        "NEW_VERSION_AVALIABLE",
        "NEW_VERSION_AVALIABLE_DESC",
        [version, description]
      )
    ) {
      return createCommonUpdateUI(locale, () =>
        downloadProgram(aria2, downloadUrl)
      );
    }
  }

  const { wineReady, wineUpdate, wineUpdateTag } = await checkWine(github);
  const prefixPath = await resolve("./wineprefix"); // CHECK: hardcoded path?
  if (wineReady) {
    const wine = await createWine({
      installDir: await resolve("./wine"), // CHECK: hardcoded path?
      prefix: prefixPath,
    });
    return await createLauncher({ aria2, wine, locale });
  } else {
    return await createWineInstallProgram({
      aria2,
      wineUpdateTarGzFile: wineUpdate,
      wineAbsPrefix: prefixPath,
      wineTag: wineUpdateTag,
      locale,
    });
  }
}
