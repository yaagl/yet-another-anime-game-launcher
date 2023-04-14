import { Aria2 } from "./aria2";
import { CommonUpdateProgram, createCommonUpdateUI } from "./common-update-ui";
import { Server } from "./constants";
import { checkCrossover, CROSSOVER_DATA, CROSSOVER_LOADER } from "./crossover";
import { Github, GithubReleases } from "./github";
import { Locale } from "./locale";
import {
  exec as unixExec,
  exec2 as unixExec2,
  getKey,
  humanFileSize,
  log,
  removeFile,
  resolve,
  rmrf_dangerously,
  setKey,
  tar_extract,
  arrayFind,
} from "./utils";
import { xattrRemove } from "./utils/unix";
import { build } from "./command-builder";
import { ensureHosts } from "./hosts";
import { ENSURE_HOSTS } from "./constants/server_secret";
import cpu_db from "./constants/cpu_db";

export async function createWine(options: {
  loaderBin: string;
  prefix: string;
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

  function toWinePath(absPath: string) {
    return "Z:" + absPath.replaceAll("/", "\\");
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
    netbiosname = `DESKTOP-${generateRandomString(6)}`; // exactly 15 chars
    await setKey("wine_netbiosname", netbiosname);
  }

  const cpuInfo = await Neutralino.computer.getCPUInfo();
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
    cmd,
    toWinePath,
    prefix: options.prefix,
    openCmdWindow,
  };
}

export type Wine = ReturnType<typeof createWine> extends Promise<infer T>
  ? T
  : never;

export async function checkWine(github: Github) {
  try {
    const wineState = await getKey("wine_state");
    if (wineState == "update") {
      return {
        wineReady: false,
        wineUpdate: await getKey("wine_update_url"),
        wineUpdateTag: await getKey("wine_update_tag"),
      } as const;
    }
    return { wineReady: true, wineTag: await getKey("wine_tag") } as const;
  } catch (e) {
    if (await checkCrossover()) {
      return {
        wineReady: false,
        wineUpdate: "not_applicable",
        wineUpdateTag: "crossover",
      } as const;
    }
    // FIXME:
    return {
      wineReady: false,
      wineUpdate: github.acceleratedPath(
        "https://github.com/3Shain/winecx/releases/download/gi-wine-1.2/wine.tar.gz"
      ),
      wineUpdateTag: "gi-wine-1.2",
    } as const;
  }
}

export async function createWineVersionChecker(github: Github) {
  function getAllReleases() {
    return github.api("/repos/3shain/winecx/releases").then(x => {
      return (x as GithubReleases).map(x => {
        return {
          tag: x.tag_name,
          url: github.acceleratedPath(
            arrayFind(x.assets, x => x.name === "wine.tar.gz")
              .browser_download_url
          ),
        };
      });
    });
  }

  return {
    getAllReleases,
  };
}

export type WineVersionChecker = ReturnType<
  typeof createWineVersionChecker
> extends Promise<infer T>
  ? T
  : never;

export async function createWineInstallProgram({
  // github:
  aria2,
  wineUpdateTarGzFile,
  wineAbsPrefix,
  wineTag,
  locale,
  server,
}: {
  aria2: Aria2;
  locale: Locale;
  wineUpdateTarGzFile: string;
  wineAbsPrefix: string;
  wineTag: string;
  server: Server;
}) {
  async function* program(): CommonUpdateProgram {
    const wineBinaryDir = await resolve("./wine");

    await rmrf_dangerously(wineAbsPrefix);
    if (wineTag === "crossover") {
      // yield* checkAndDownloadMoltenVK(aria2);
      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await ensureHosts(ENSURE_HOSTS);
      yield ["setUndeterminedProgress"];
    } else {
      yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
      const wineTarPath = await resolve("./wine.tar.gz");
      for await (const progress of aria2.doStreamingDownload({
        uri: wineUpdateTarGzFile,
        absDst: wineTarPath,
      })) {
        yield [
          "setProgress",
          Number(
            (progress.completedLength * BigInt(100)) / progress.totalLength
          ),
        ];
        yield [
          "setStateText",
          "DOWNLOADING_ENVIRONMENT_SPEED",
          `${humanFileSize(Number(progress.downloadSpeed))}`,
        ];
      }
      yield ["setStateText", "EXTRACT_ENVIRONMENT"];
      yield ["setUndeterminedProgress"];
      await rmrf_dangerously(wineBinaryDir);
      await unixExec(["mkdir", "-p", wineBinaryDir]);
      await tar_extract(await resolve("./wine.tar.gz"), wineBinaryDir);
      await removeFile(wineTarPath);

      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await xattrRemove("com.apple.quarantine", wineBinaryDir);
    }

    const wine64Bin =
      wineTag === "crossover"
        ? CROSSOVER_LOADER
        : await resolve("./wine/bin/wine64");
    await unixExec([wine64Bin, "wineboot", "-u"], {
      WINEPREFIX: wineAbsPrefix,
    });
    await unixExec([wine64Bin, "winecfg", "-v", "win10"], {
      WINEPREFIX: wineAbsPrefix,
    });
    if (wineTag === "crossover") {
      await unixExec(
        [
          wine64Bin,
          "rundll32",
          "setupapi.dll,InstallHinfSection",
          "Win10Install",
          "128",
          "Z:" + `${CROSSOVER_DATA}/crossover.inf`.replaceAll("/", "\\"),
        ],
        {
          WINEPREFIX: wineAbsPrefix,
        }
      );
      await unixExec([wine64Bin, "rundll32", "mscoree.dll,wine_install_mono"], {
        WINEPREFIX: wineAbsPrefix,
      });
    }

    // if (existBackup) {
    //   yield ["setStateText", "RECOVER_BACKUP_USER_DATA"];
    //   await unixExec(wine64Bin, ["regedit", "backup1.reg"], {
    //     WINEPREFIX: `${wineAbsPrefix}`,
    //   });
    //   await removeFile(await resolve("./backup1.reg"));
    //   await unixExec(wine64Bin, ["regedit", "backup2.reg"], {
    //     WINEPREFIX: `${wineAbsPrefix}`,
    //   });
    //   await removeFile(await resolve("./backup2.reg"));
    // }
    await setKey("wine_state", "ready");
    await setKey("wine_tag", wineTag);
    await setKey("wine_update_url", null);
    await setKey("wine_update_tag", null);
    const netbiosname = `DESKTOP-${generateRandomString(6)}`; // exactly 15 chars
    await setKey("wine_netbiosname", netbiosname);
    yield ["setStateText", "INSTALL_DONE"];
  }

  return createCommonUpdateUI(locale, program);
}

// by New Bing
function generateRandomString(n: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * chars.length);
    const char = chars.charAt(index);
    result += char;
  }
  return result;
}
