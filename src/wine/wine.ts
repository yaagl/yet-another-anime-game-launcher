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
} from "@utils";
import cpu_db from "../constants/cpu_db";
import { dirname, join } from "path-browserify";

export interface WineAttribute {
  isGamePortingToolkit: boolean;
}

export async function createWine(options: {
  loaderBin: string;
  prefix: string;
  attributes: WineAttribute;
}) {
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
        ? [options.loaderBin, "cmd", "/c", program, ...args]
        : [options.loaderBin, program, ...args],
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
    log_file: string | undefined = undefined
  ) {
    return await unixExec2(
      program == "copy"
        ? [options.loaderBin, "cmd", "/c", program, ...args]
        : [options.loaderBin, program, ...args],
      {
        ...getEnvironmentVariables(),
        ...(env ?? {}),
      },
      false,
      log_file
    );
  }

  async function waitUntilServerOff() {
    return await unixExec2(
      [join(dirname(options.loaderBin), "wineserver"), "-w"],
      {
        ...getEnvironmentVariables(),
      }
    );
  }

  function toWinePath(absPath: string) {
    return "Z:" + `${absPath}`.replaceAll("/", "\\");
  }

  function getEnvironmentVariables() {
    return {
      WINEESYNC: "1",
      WINEDEBUG: "fixme-all,err-unwind,+timestamp",
      WINEPREFIX: options.prefix,
      GIWINEPCNAME: `${netbiosname}`,
      ...fakeCpu,
      GIWINESYSMANU: "OEM",
      GIWINESYSPRODNAME: "Generic x86-64",
      GIWINESYSFAML: "B350", // I made it up
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
          `"${build([options.loaderBin, "cmd"], {
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

  const cpuInfo = await getCPUInfo();
  await log(JSON.stringify(cpuInfo));
  const fakeCpu: Record<string, string> =
    cpuInfo.model.indexOf("Apple") >= 0
      ? cpuInfo.logicalThreads in cpu_db
        ? {
            GIWINECPUNAME: cpu_db[cpuInfo.logicalThreads as 8][0].name,
            GIWINECPUFREQ: cpu_db[cpuInfo.logicalThreads as 8][0].frequency,
            GIWINECPUVID: cpu_db[cpuInfo.logicalThreads as 8][0].vendor,
          }
        : {}
      : {};

  return {
    exec,
    exec2,
    waitUntilServerOff,
    cmd,
    toWinePath,
    prefix: options.prefix,
    openCmdWindow,
    attributes: options.attributes,
  };
}

export type Wine = ReturnType<typeof createWine> extends Promise<infer T>
  ? T
  : never;
