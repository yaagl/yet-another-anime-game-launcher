import { join } from "path-browserify";
import { Aria2 } from "./aria2";
import { CommonUpdateProgram, createCommonUpdateUI } from "./common-update-ui";
import { Github } from "./github";
import {
  exec as unixExec,
  fatal,
  getKey,
  log,
  resolve,
  restart,
  rmrf_dangerously,
  setKey,
  tar_extract,
  wait,
} from "./utils";
import { xattrRemove } from "./utils/unix";

export async function createWine(options: {
  installDir: string;
  prefix: string;
}) {
  async function cmd(command: string, args: string[]) {
    return await exec("cmd", [command, ...args]);
  }

  async function exec(
    program: string,
    args: string[],
    env?: { [key: string]: string }
  ) {
    return await unixExec(
      join(options.installDir, "bin/wine64"),
      program == "copy" ? ["cmd", "/c", program, ...args] : [program, ...args],
      {
        WINEPREFIX: `"${options.prefix}"`,
        ...(env ?? {}),
      }
    );
  }

  function toWinePath(absPath: string) {
    return "Z:" + absPath.replaceAll("/", "\\");
  }

  return {
    exec,
    cmd,
    toWinePath,
    prefix: options.prefix,
  };
}

export type Wine = ReturnType<typeof createWine> extends Promise<infer T>
  ? T
  : never;

export async function checkWine(github: Github) {
  // TODO
  try {
    const wineState = await getKey("wine_state");
    if (wineState == "update") {
      return {
        wineReady: false,
        wineUpdate: await getKey("wine_update_url"),
        wineUpdateTag: await getKey("wine_update_tag"),
      } as const;
    }
    return { wineReady: true } as const;
  } catch (e) {
    // FIXME:
    return {
      wineReady: false,
      wineUpdate: github.acceleratedPath(
        "https://github.com/3Shain/winecx/releases/download/gi-wine-1.0/wine.tar.gz"
      ),
      wineUpdateTag: "gi-wine-1.0",
    } as const;
  }
}

export async function createWineInstallProgram({
  // github:
  aria2,
  wineUpdateTarGzFile,
  wineAbsPrefix,
  wineTag,
}: {
  aria2: Aria2;
  wineUpdateTarGzFile: string;
  wineAbsPrefix: string;
  wineTag: string;
}) {
  async function* program(): CommonUpdateProgram {
    yield ["setStateText", "DOWNLOADING_ENVIROMENT"];
    for await (const progress of aria2.doStreamingDownload({
      uri: wineUpdateTarGzFile,
      absDst: await resolve("./wine.tar.gz"),
    })) {
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(100)) / progress.totalLength),
      ];
    }
    yield ["setStateText", "EXTRACT_ENVIROMENT"];
    yield ["setUndeterminedProgress"];

    const wineBinaryDir = await resolve("./wine");
    await rmrf_dangerously(wineBinaryDir);
    await unixExec("mkdir", ["-p", wineBinaryDir]);
    const p = await tar_extract(await resolve("./wine.tar.gz"), wineBinaryDir);
    await log(p.stdOut);
    yield ["setStateText", "CONFIGURING_ENVIROMENT"];

    await xattrRemove("com.apple.quarantine", wineBinaryDir);

    const wine64Bin = await resolve("./wine/bin/wine64");
    const d = await unixExec(wine64Bin, ["wineboot", "-u"], {
      WINEPREFIX: `"${wineAbsPrefix}"`,
    });
    await log(d.stdOut);
    const g = await unixExec(wine64Bin, ["winecfg", "-v", "win10"], {
      WINEPREFIX: `"${wineAbsPrefix}"`,
    });
    await log(g.stdOut);
    await setKey("wine_state", "ready");
    await setKey("wine_tag", wineTag);
    await setKey("wine_update_url", null);
    await setKey("wine_update_tag", null);
  }

  return createCommonUpdateUI(program);
}
