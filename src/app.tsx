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
} from "./utils";
import { createAria2 } from "./aria2";
import { checkWine, createWine, createWineInstallProgram } from "./wine";
import { createGithubEndpoint } from "./github";
import { createLauncher } from "./launcher";
import "./app.css";
import { CURRENT_YAAGL_VERSION } from "./constants";
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";

export async function createApp() {
  let aria2_port = 6868;

  await Neutralino.events.on("ready", async () => {});
  await Neutralino.events.on("windowClose", async () => {
    if (await GLOBAL_onClose(false)) {
      Neutralino.app.exit(0);
    }
  });

  const github = await createGithubEndpoint();
  const aria2_session = await resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = await spawn("./sidecar/aria2/aria2c", [
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
  ]);
  addTerminationHook(async () => {
    await log("killing process " + pid);
    await exec("kill", [pid + ""]);
    return true;
  });
  const aria2 = await Promise.race([
    createAria2({ host: "127.0.0.1", port: aria2_port }),
    timeout(10000),
  ]).catch(() => Promise.reject(new Error("Fail to launch aria2.")));
  await log(`Launched aria2 version ${aria2.version.version}`);

  const { latest, downloadUrl } = await createUpdater({
    github,
    aria2,
  });
  // return createCommonUpdateUI(async function *(){
  //   yield ['setStateText','测试进度'];
  //   for(let i=0;i<=100;i++) {
  //     yield ['setProgress', i];
  //     await wait(50);
  //   }
  //   yield ['setUndeterminedProgress'];
  //   await wait(2000);
  //   yield ['setStateText','完成'];
  // });
  if (!latest) {
    if (
      await prompt(
        "NEW Version available",
        "Would you like to update to the latest version?"
      )
    ) {
      return createCommonUpdateUI(() => downloadProgram(aria2, downloadUrl));
    }
  }

  return () => (
    <div>
      If you are seeing this, it means everything works fine!
      <br /> Current version: {CURRENT_YAAGL_VERSION}
    </div>
  );

  const { wineReady, wineUpdate } = await checkWine();

  if (wineReady) {
    const wine = await createWine({
      prefix: "FIXME",
    });
    return await createLauncher({ aria2, wine });
  } else {
    return await createWineInstallProgram({
      aria2,
      wineUpdate: wineUpdate!,
    });
  }
}
