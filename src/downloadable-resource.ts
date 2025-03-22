import { eq } from "semver";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  mkdirp,
  resolve,
  humanFileSize,
  setKey,
  getKeyOrDefault,
  fileOrDirExists,
  doStreamUnzip,
  forceMove,
  readBinary,
  writeBinary,
  writeFile,
  rmrf_dangerously,
} from "@utils";
import { Wine } from "@wine";
import { join } from "path-browserify";

const CURRENT_MVK_VERSION = "1.2.2";

export async function* checkAndDownloadMoltenVK(
  aria2: Aria2
): CommonUpdateProgram {
  if (
    (await fileOrDirExists("./moltenvk/libMoltenVK.dylib")) &&
    eq(
      CURRENT_MVK_VERSION,
      await getKeyOrDefault("installed_moltenvk_version", "0.0.0")
    )
  ) {
    return;
  }

  await mkdirp("./moltenvk");
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for await (const progress of aria2.doStreamingDownload({
    uri: "https://github.com/3Shain/winecx/releases/download/gi-wine-1.0/libMoltenVK.dylib",
    absDst: resolve("./moltenvk/libMoltenVK.dylib"),
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
  setKey("installed_moltenvk_version", CURRENT_MVK_VERSION);
}

export const DXVK_FILES = [
  "d3d9.dll",
  "d3d10core.dll",
  "d3d11.dll",
  "dxgi.dll",
];
const CURRENT_DXVK_VERSION = "1.10.4-alpha.20230402"; // there is no 1.10.4! I have to make up something greater than 1.10.3
const CURRENT_JADEITE_VERSION = "4.1.0";

export async function* checkAndDownloadDXVK(aria2: Aria2): CommonUpdateProgram {
  if (
    eq(
      CURRENT_DXVK_VERSION,
      await getKeyOrDefault("installed_dxvk_version", "0.0.0")
    )
  ) {
    return;
  }

  await mkdirp("./dxvk");
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for (const file of DXVK_FILES) {
    for await (const progress of aria2.doStreamingDownload({
      uri: `https://github.com/3Shain/winecx/releases/download/gi-wine-1.0/${file}`,
      absDst: resolve(`./dxvk/${file}`),
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
  }

  setKey("installed_dxvk_version", CURRENT_DXVK_VERSION);
}

export async function* checkAndDownloadJadeite(
  aria2: Aria2
): CommonUpdateProgram {
  if (
    eq(
      CURRENT_JADEITE_VERSION,
      await getKeyOrDefault("installed_jadeite_version", "0.0.0")
    )
  ) {
    return;
  }

  await rmrf_dangerously(resolve(`./jadeite`));

  await mkdirp("./jadeite");
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for await (const progress of aria2.doStreamingDownload({
    uri: `https://codeberg.org/mkrsym1/jadeite/releases/download/v4.1.0/v4.1.0.zip`,
    absDst: resolve(`./jadeite/archive.zip`),
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

  for await (const [dec, total] of doStreamUnzip(
    resolve(`./jadeite/archive.zip`),
    resolve(`./jadeite`)
  )) {
    yield ["setProgress", (dec / total) * 100];
  }

  setKey("installed_jadeite_version", CURRENT_JADEITE_VERSION);
}

export const DXMT_FILES = ["d3d10core.dll", "d3d11.dll", "dxgi.dll"];

const DXMT_FILES_WITH_UNIXLIB = [
  ...DXMT_FILES,
  "winemetal.dll",
  "winemetal.so",
  "nvngx.dll",
];

const CURRENT_DXMT_VERSION = "0.41.0";

export async function* checkAndDownloadDXMT(aria2: Aria2): CommonUpdateProgram {
  if (
    eq(
      CURRENT_DXMT_VERSION,
      await getKeyOrDefault("installed_dxmt_version", "0.0.0")
    )
  ) {
    return;
  }

  await mkdirp("./dxmt");
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for (const file of DXMT_FILES_WITH_UNIXLIB) {
    for await (const progress of aria2.doStreamingDownload({
      uri: `https://github.com/3Shain/wine/releases/download/dxmt-41/${file}`,
      absDst: resolve(`./dxmt/${file}`),
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
  }

  setKey("installed_dxmt_version", CURRENT_DXMT_VERSION);
}

const CURRENT_RESHADE_VERSION = "5.8.0";

export async function* checkAndDownloadReshade(
  aria2: Aria2,
  wine: Wine,
  gameDir: string
): CommonUpdateProgram {
  const reshaderDir = resolve("./reshade");

  if (
    eq(
      CURRENT_RESHADE_VERSION,
      await getKeyOrDefault("installed_reshade", "0.0.0")
    )
  ) {
    return;
  }

  await mkdirp(reshaderDir);
  await mkdirp(join(reshaderDir, "Shaders"));
  await mkdirp(join(reshaderDir, "Textures"));
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for await (const progress of aria2.doStreamingDownload({
    uri: `https://reshade.me/downloads/ReShade_Setup_${CURRENT_RESHADE_VERSION}_Addon.exe`,
    absDst: join(reshaderDir, "install.exe"),
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
  for await (const progress of aria2.doStreamingDownload({
    uri: `https://lutris.net/files/tools/dll/d3dcompiler_47.dll`,
    absDst: join(reshaderDir, "d3dcompiler_47.dll"),
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
  yield ["setStateText", "EXTRACT_ENVIRONMENT"];
  yield ["setUndeterminedProgress"];
  const b = await readBinary(join(reshaderDir, "install.exe"));
  const s = new Uint8Array(b);
  const offset = s.findIndex((v, idx, arr) => {
    return (
      v == 0x50 &&
      arr[idx + 1] == 0x4b &&
      arr[idx + 2] == 0x03 &&
      arr[idx + 3] == 0x04
    );
  });
  await writeBinary(join(reshaderDir, "install.zip"), b.slice(offset));

  for await (const [dec, total] of doStreamUnzip(
    join(reshaderDir, "install.zip"),
    reshaderDir
  )) {
    yield ["setProgress", (dec / total) * 100];
  }

  await forceMove(
    join(reshaderDir, "ReShade64.dll"),
    join(reshaderDir, "dxgi.dll")
  );

  writeFile(
    join(gameDir, "ReShade.ini"),
    `[GENERAL]
EffectSearchPaths=${wine.toWinePath(resolve("./reshade/Shaders"))}
TextureSearchPaths=${wine.toWinePath(resolve("./reshade/Textures"))}`
  );

  setKey("installed_reshade", CURRENT_RESHADE_VERSION);
}
