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
} from "@utils";
import type { ExecOptions } from "@utils";
import { dirname, join } from "path-browserify";
import { WineDistribution } from "./distro";
import type { WineDistributionAttributes } from "./distro";

export const DEFAULT_WINEDEBUG = "fixme-all,err-unwind,+timestamp";
export const DEBUG_WINEDEBUG =
  "+timestamp,+pid,+tid,+process,+module,+loaddll,+seh,+unwind";

export function buildWineEnvironmentVariables({
  prefix,
  attributes,
  env,
}: {
  prefix: string;
  attributes: Partial<WineDistributionAttributes>;
  env?: { [key: string]: string };
}) {
  const base: { [key: string]: string } = {
    WINEDEBUG: DEFAULT_WINEDEBUG,
    WINEPREFIX: prefix,
    ...(attributes.renderBackend == "dxmt" ? { WINEMSYNC: "1" } : {}),
  };
  return {
    ...base,
    ...(env ?? {}),
  };
}

function withPhase(options: ExecOptions | undefined, phase: string) {
  return {
    ...(options ?? {}),
    phase,
    allowFailure: true,
  };
}

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
    log_file: string | ExecOptions | undefined = undefined
  ) {
    return await unixExec(
      program == "copy"
        ? [loaderBin, "cmd", "/c", program, ...args]
        : [loaderBin, program, ...args],
      getEnvironmentVariables(env),
      false,
      log_file
    );
  }

  async function exec2(
    program: string,
    args: string[],
    env?: { [key: string]: string },
    log_file: string | ExecOptions | undefined = undefined
  ) {
    return await unixExec2(
      program == "copy"
        ? [loaderBin, "cmd", "/c", program, ...args]
        : [loaderBin, program, ...args],
      getEnvironmentVariables(env),
      false,
      log_file
    );
  }

  async function waitUntilServerOff(options?: ExecOptions) {
    return await unixExec2(
      [join(dirname(loaderBin), "wineserver"), "-w"],
      getEnvironmentVariables(),
      false,
      options
    );
  }

  async function stopServer(
    env: { [key: string]: string },
    options?: ExecOptions
  ) {
    await unixExec2(
      [join(dirname(loaderBin), "wineserver"), "-k"],
      env,
      false,
      withPhase(options, "wine.wineserver-k")
    );
    await unixExec2(
      [join(dirname(loaderBin), "wineserver"), "-w"],
      env,
      false,
      withPhase(options, "wine.wineserver-wait")
    );
  }

  async function prepareForLaunch(options?: ExecOptions) {
    await stopServer(getEnvironmentVariables(), options);
    if (isMsyncEnabled()) {
      await stopServer(getEnvironmentVariables({ WINEMSYNC: "" }), options);
    }
  }

  function toWinePath(absPath: string) {
    return "Z:" + `${absPath}`.replaceAll("/", "\\");
  }

  function getEnvironmentVariables(env?: { [key: string]: string }) {
    return buildWineEnvironmentVariables({
      prefix: options.prefix,
      attributes: options.distro.attributes,
      env,
    });
  }

  function isMsyncEnabled() {
    return options.distro.attributes.renderBackend == "dxmt";
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
            ...getEnvironmentVariables({
              WINEPATH: toWinePath(gameDir),
            }),
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

  async function setProps(
    props: { retina: boolean; leftCmd: boolean },
    options?: { logFile?: string; debug?: boolean }
  ) {
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
      options?.debug
        ? {
            phase: "wine.setProps",
            logFile: options.logFile,
            teeOutput: true,
            debug: true,
          }
        : "/dev/null"
    );
    await waitUntilServerOff(
      options?.debug
        ? {
            phase: "wine.setProps.wineserver-wait",
            logFile: options.logFile,
            teeOutput: true,
            debug: true,
          }
        : undefined
    );
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
    waitUntilServerOff,
    prepareForLaunch,
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
