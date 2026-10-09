import {
  exec as unixExec,
  exec2 as unixExec2,
  getKey,
  log,
  setKey,
  arrayFind,
  getCPUInfo,
  build,
  generateRandomString,
  stats,
  resolve,
  writeFile,
  readBinary,
} from "@utils";
import { dirname, join } from "path-browserify";
import { WineDistribution } from "./distro";
import gameModeBundleScript from "../constants/macos_game_mode_bundle.sh?raw";

export async function createWine(options: {
  prefix: string;
  distro: WineDistribution;
}) {
  const loaderBin = await getCorrectWineBinary();

  async function cmd(command: string, args: string[]) {
    return await exec("cmd", [command, ...args]);
  }

  async function exec(
    program: string,
    args: string[],
    env?: { [key: string]: string },
    log_file: string | undefined = undefined
  ) {
    return await unixExec(
      program == "copy"
        ? [loaderBin, "cmd", "/c", program, ...args]
        : [loaderBin, program, ...args],
      {
        ...getEnvironmentVariables(),
        ...(env ?? {}),
      },
      false,
      log_file
    );
  }

  async function exec2(
    program: string,
    args: string[],
    env?: { [key: string]: string },
    log_file: string | undefined = undefined,
    loader: string = loaderBin
  ) {
    return await unixExec2(
      program == "copy"
        ? [loader, "cmd", "/c", program, ...args]
        : [loader, program, ...args],
      {
        ...getEnvironmentVariables(),
        ...(env ?? {}),
      },
      false,
      log_file
    );
  }

  // macOS only enables Game Mode for apps whose bundle declares a game
  // category. Builds (or refreshes) such a bundle around Wine's loader and
  // returns how to launch the game through it; falls back to a normal launch.
  async function prepareGameModeLaunch(
    name: string,
    id: string
  ): Promise<{ loader?: string; env: { [key: string]: string } }> {
    const bundle = resolve(`./gamemode/${id}.app`);
    const bundleLoader = join(bundle, "Contents/MacOS/wine");
    try {
      const script = resolve("./macos_game_mode_bundle.sh");
      await writeFile(script, gameModeBundleScript);
      await unixExec([
        "/bin/sh",
        script,
        bundle,
        resolve("./wine"),
        name,
        `com.3shain.yaagl.gamemode.${id}`,
        resolve("./icon.icns"),
      ]);
    } catch (e) {
      await log(`macOS Game Mode bundle unavailable: ${e}`);
      return { env: {} };
    }
    // A wrapper script as bin/wine sets up its runtime's environment, so keep
    // launching through it and let it exec the bundle loader if it supports it.
    const head = new Uint8Array(await readBinary(loaderBin)).subarray(0, 2);
    if (head[0] == 0x23 && head[1] == 0x21) {
      return { env: { YAAGL_GAME_MODE_LOADER: bundleLoader } };
    }
    return { loader: bundleLoader, env: {} };
  }

  async function waitUntilServerOff() {
    return await unixExec2([join(dirname(loaderBin), "wineserver"), "-w"], {
      ...getEnvironmentVariables(),
    });
  }

  function toWinePath(absPath: string) {
    return "Z:" + `${absPath}`.replaceAll("/", "\\");
  }

  function getEnvironmentVariables() {
    return {
      WINEDEBUG: "fixme-all,err-unwind,+timestamp",
      WINEPREFIX: options.prefix,
    };
  }

  async function openCmdWindow({ gameDir }: { gameDir: string }) {
    return await unixExec2(
      [
        `osascript`,
        "-e",
        [
          "tell",
          "app",
          '"Terminal"',
          "to",
          "do",
          "script",
          `"${build([loaderBin, "cmd"], {
            ...getEnvironmentVariables(),
            WINEPATH: toWinePath(gameDir),
          })
            .replaceAll("\\", "\\\\")
            .replaceAll('"', '\\"')}"`,
        ].join(" "),
        "-e",
        ["tell", "app", '"Terminal"', "to", "activate"].join(" "),
      ],
      {},
      false,
      "/dev/null"
    );
  }

  let netbiosname: string;
  try {
    netbiosname = await getKey("wine_netbiosname");
  } catch {
    netbiosname = `DESKTOP-${generateRandomString(7)}`; // exactly 15 chars
    await setKey("wine_netbiosname", netbiosname);
  }

  async function setProps(props: { retina: boolean; leftCmd: boolean }) {
    const cmd = `@echo off
cd "%~dp0"
reg add "HKEY_CURRENT_USER\\Software\\Wine\\Mac Driver" /v RetinaMode /t REG_SZ /d ${
      props.retina ? "y" : "n"
    } /f
reg add "HKEY_CURRENT_USER\\Software\\Wine\\Mac Driver" /v LeftCommandIsCtrl /t REG_SZ /d ${
      props.leftCmd ? "y" : "n"
    } /f
`;
    await writeFile(resolve("winedrv_config.bat"), cmd);
    await exec(
      "cmd",
      ["/c", `${toWinePath(resolve("./winedrv_config.bat"))}`],
      {},
      "/dev/null"
    );
    await waitUntilServerOff();
  }

  async function setNVExtension() {
    const cmd = `@echo off
cd "%~dp0"
reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\NVIDIA Corporation\\Global" /v "{41FCC608-8496-4DEF-B43E-7D9BD675A6FF}" /t REG_BINARY /d 1 /f
reg add "HKEY_LOCAL_MACHINE\\SYSTEM\\ControlSet001\\Services\\nvlddmkm" /v "{41FCC608-8496-4DEF-B43E-7D9BD675A6FF}" /t REG_BINARY /d 1 /f
reg add "HKEY_LOCAL_MACHINE\\SOFTWARE\\NVIDIA Corporation\\Global\\NGXCore" /v FullPath /t REG_SZ /d "C:\\Windows\\System32" /f
`;
    await writeFile(resolve("winedrv_config.bat"), cmd);
    await exec(
      "cmd",
      ["/c", `${toWinePath(resolve("./winedrv_config.bat"))}`],
      {},
      "/dev/null"
    );
    await waitUntilServerOff();
  }

  return {
    exec,
    exec2,
    prepareGameModeLaunch,
    waitUntilServerOff,
    cmd,
    toWinePath,
    prefix: options.prefix,
    openCmdWindow,
    setProps,
    setNVExtension,
    attributes: {
      ...options.distro.attributes,
    },
  };
}

export async function getCorrectWineBinary() {
  try {
    // use wine64 if it is presented
    // in newer version of wine (esp. WoW64 mode), only one binary `bin/wine` exists
    await stats("./wine/bin/wine64");
    return resolve("./wine/bin/wine64");
  } catch {
    return resolve("./wine/bin/wine");
  }
}

export type Wine = ReturnType<typeof createWine> extends Promise<infer T>
  ? T
  : never;
