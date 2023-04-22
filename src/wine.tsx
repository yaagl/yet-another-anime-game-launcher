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
  writeFile,
  forceMove,
} from "./utils";
import { xattrRemove } from "./utils/unix";
import { build } from "./command-builder";
import { ensureHosts } from "./hosts";
import { ENSURE_HOSTS } from "./clients/secret";
import cpu_db from "./constants/cpu_db";
import { join } from "path-browserify";

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
    // if (await checkCrossover()) {
    //   return {
    //     wineReady: false,
    //     wineUpdate: "not_applicable",
    //     wineUpdateTag: "crossover",
    //   } as const;
    // }
    // FIXME:
    return {
      wineReady: false,
      wineUpdate: github.acceleratedPath(DEFAULT_WINE_DISTRO_URL),
      wineUpdateTag: DEFAULT_WINE_DISTRO_TAG,
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
}: {
  aria2: Aria2;
  locale: Locale;
  wineUpdateTarGzFile: string;
  wineAbsPrefix: string;
  wineTag: string;
}) {
  async function* program(): CommonUpdateProgram {
    const wineBinaryDir = resolve("./wine");

    await rmrf_dangerously(wineAbsPrefix);
    if (wineTag === "crossover") {
      // yield* checkAndDownloadMoltenVK(aria2);
      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await ensureHosts(ENSURE_HOSTS);
      yield ["setUndeterminedProgress"];
    } else {
      yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
      const wineTarPath = resolve("./wine.tar.gz");
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
      await tar_extract(resolve("./wine.tar.gz"), wineBinaryDir);
      await removeFile(wineTarPath);

      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await xattrRemove("com.apple.quarantine", wineBinaryDir);
    }

    const wine64Bin =
      wineTag === "crossover"
        ? CROSSOVER_LOADER
        : resolve("./wine/bin/wine64");
    const wine = await createWine({
      loaderBin: wine64Bin,
      prefix: wineAbsPrefix,
    });
    await wine.exec("wineboot", ["-u"], {}, "/dev/null");
    await wine.exec("winecfg", ["-v", "win10"], {}, "/dev/null");
    if (wineTag === "crossover") {
      await wine.exec(
        "rundll32",
        [
          "setupapi.dll,InstallHinfSection",
          "Win10Install",
          "128",
          "Z:" + `${CROSSOVER_DATA}/crossover.inf`.replaceAll("/", "\\"),
        ],
        {},
        "/dev/null"
      );
      await wine.exec(
        "rundll32",
        ["mscoree.dll,wine_install_mono"],
        {},
        "/dev/null"
      );
    }

    // FIXME: don't abuse import.meta.env
    if (String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("bh3")) {
      yield* installMediaFoundation(aria2, wine);
    }

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

const MF_DLLS = [
  "colorcnv",
  "mf",
  "mferror",
  "mfplat",
  "mfplay",
  "mfreadwrite",
  "msmpeg2adec",
  "msmpeg2vdec",
  "sqmapi",
];

const MF_SRVS = ["colorcnv", "msmpeg2adec", "msmpeg2vdec"];

import mf from "./constants/mf.reg?raw";
import wmf from "./constants/wmf.reg?raw";
import { DEFAULT_WINE_DISTRO_TAG, DEFAULT_WINE_DISTRO_URL } from "./clients";

async function* installMediaFoundation(
  aria2: Aria2,
  wine: Wine
): CommonUpdateProgram {
  for (const dll of MF_DLLS) {
    yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
    for await (const progress of aria2.doStreamingDownload({
      uri: `https://github.com/z0z0z/mf-install/raw/master/system32/${dll}.dll`,
      absDst: join(
        wine.prefix,
        "drive_c",
        "windows",
        "system32",
        `${dll}.dll.downloading`
      ),
    })) {
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(100)) / progress.totalLength),
      ];
      yield [
        "setStateText",
        "DOWNLOADING_ENVIRONMENT_SPEED",
        `${humanFileSize(Number(progress.downloadSpeed))}`,
      ];
    }
    await forceMove(
      join(
        wine.prefix,
        "drive_c",
        "windows",
        "system32",
        `${dll}.dll.downloading`
      ),
      join(wine.prefix, "drive_c", "windows", "system32", `${dll}.dll`)
    );
    await wine.exec(
      "reg",
      [
        "add",
        `HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides`,
        "/v",
        dll,
        "/d",
        "native",
        "/f",
      ],
      {},
      "/dev/null"
    );
  }
  yield ["setStateText", "CONFIGURING_ENVIRONMENT"];
  await writeFile("mf.reg", mf);
  await wine.exec(
    "regedit",
    [wine.toWinePath(resolve("mf.reg"))],
    {},
    "/dev/null"
  );
  await removeFile("mf.reg");
  await writeFile("wmf.reg", wmf);
  await wine.exec(
    "regedit",
    [wine.toWinePath(resolve("wmf.reg"))],
    {},
    "/dev/null"
  );
  await removeFile("wmf.reg");
  for (const srv of MF_SRVS) {
    await wine.exec("regsvr32", [`${srv}.dll`], {}, "/dev/null");
  }
}
