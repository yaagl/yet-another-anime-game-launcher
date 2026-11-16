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
  initializeBundledResources,
  resolveResource,
} from "./utils";
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
import { createUpdater } from "./updater";
import { createLocale } from "./locale";
import { createClient } from "./clients";
import { createWineUnavailableUI } from "./wine/initial-setup";
import type { Component } from "solid-js";

export async function createApp() {
  await initializeBundledResources();
  await setKey("singleton", null);

  const aria2_port = 6868;
  let closing = false;

  await Neutralino.events.on("windowClose", async () => {
    if (closing) return;
    closing = true;
    try {
      if (await GLOBAL_onClose(false)) await exit(0);
    } finally {
      closing = false;
    }
  });

  const locale = await createLocale();
  const github = await createGithubEndpoint();
  const aria2_session = resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  const { pid: apid } = await spawn([
    resolveResource("./sidecar/aria2/aria2c"),
    "-d",
    "/",
    "--no-conf",
    "--enable-rpc",
    `--rpc-listen-port=${aria2_port}`,
    `--rpc-listen-all=true`,
    `--rpc-allow-origin-all`,
    `--input-file`,
    `${aria2_session}`,
    `--save-session`,
    `${aria2_session}`,
    `--pause`,
    `true`,
    "--stop-with-process",
    pid,
  ]);
  addTerminationHook(async () => {
    // double insurance (esp. for self restart)
    await log("killing process " + apid);
    try {
      await exec(["kill", apid + ""]);
    } catch {
      await log("killing process failed?");
    }
    return true;
  });
  const aria2 = await Promise.race([
    createAria2Retry({ host: "127.0.0.1", port: aria2_port }),
    timeout(15000),
  ]).catch(() =>
    Promise.reject(
      new Error(
        "Failed to start download service. Please restart the application."
      )
    )
  );
  await log(`Launched aria2 version ${aria2.version.version}`);
  const updater = await createUpdater(pid);
  const wineStatus = await checkWine(github);
  const prefixPath = resolve("./wineprefix");
  const onCheckUpdate = () => updater.checkForUpdates();
  let MainApp: Component;

  if ("unavailable" in wineStatus) {
    MainApp = createWineUnavailableUI({ ...wineStatus, onCheckUpdate });
  } else if (wineStatus.wineReady) {
    const wine = await createWine({
      prefix: prefixPath,
      distro: wineStatus.wineDistribution,
    });
    MainApp = await createLauncher({
      wine,
      locale,
      github,
      channelClient: await createClient({
        wine,
        aria2,
        locale,
      }),
      onCheckUpdate,
    });
  } else {
    MainApp = await createWineInstallProgram({
      aria2,
      wineAbsPrefix: prefixPath,
      wineDistro: wineStatus.wineDistribution,
      wineUpdate: wineStatus.wineUpdate,
      locale,
    });
  }

  await updater.checkInBackground();
  return MainApp;
}
