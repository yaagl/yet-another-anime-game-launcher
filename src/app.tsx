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
  getKeyOrDefault,
  osascriptDialog,
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
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";
import { createLocale } from "./locale";
import { createClient } from "./clients";
import { Aria2 } from "./aria2";
import { Github } from "./github";
import { Locale } from "./locale";

async function createLauncherUI(deps: {
  aria2: Aria2;
  locale: Locale;
  github: Github;
}) {
  const wineStatus = await checkWine(deps.github);
  const prefixPath = resolve("./wineprefix"); // CHECK: hardcoded path?

  if (wineStatus.wineReady) {
    const wine = await createWine({
      prefix: prefixPath,
      distro: wineStatus.wineDistribution,
    });
    return await createLauncher({
      wine,
      locale: deps.locale,
      github: deps.github,
      channelClient: await createClient({
        wine,
        aria2: deps.aria2,
        locale: deps.locale,
      }),
    });
  } else {
    return await createWineInstallProgram({
      aria2: deps.aria2,
      wineAbsPrefix: prefixPath,
      wineDistro: wineStatus.wineDistribution,
      locale: deps.locale,
    });
  }
}

export async function createApp() {
  await setKey("singleton", null);

  const aria2_port = 6868;

  await Neutralino.events.on("windowClose", async () => {
    if (await GLOBAL_onClose(false)) {
      exit(0);
    }
  });

  const locale = await createLocale();
  const github = await createGithubEndpoint();
  const aria2_session = resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  const { pid: apid } = await spawn([
    "./sidecar/aria2/aria2c",
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
  const { latest, downloadUrl, sidecarDownloadUrl, description, version } =
    await createUpdater({ github, aria2 });
  const SKIPPED_VERSION_KEY = "config_skippedVersion";
  const skippedVersion = await getKeyOrDefault(SKIPPED_VERSION_KEY, "");
  await log(
    `Updater status: latest=${String(latest)}, skippedVersion=${skippedVersion}`
  );
  if (latest == false && version !== skippedVersion) {
    const btnUpdate = locale.get("LAUNCHER_UPDATE_NOW");
    const btnSkip = locale.get("LAUNCHER_SKIP_VERSION");
    const btnLater = locale.get("LAUNCHER_UPDATE_LATER");
    const clicked = await osascriptDialog({
      title: locale.get("NEW_VERSION_AVALIABLE"),
      message: locale.format("NEW_VERSION_AVALIABLE_DESC", [
        version,
        description,
      ]),
      buttons: [btnLater, btnSkip, btnUpdate],
      defaultButton: btnUpdate,
    });
    if (clicked === btnUpdate) {
      return createCommonUpdateUI(locale, () =>
        downloadProgram(aria2, downloadUrl, sidecarDownloadUrl)
      );
    } else if (clicked === btnSkip) {
      await setKey(SKIPPED_VERSION_KEY, version);
    }
    // null (dismissed) or btnLater → fall through to launcher
  }

  return createLauncherUI({ aria2, locale, github });
}
