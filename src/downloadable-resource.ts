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
  exec,
  removeFile,
} from "@utils";
import type { Wine } from "@wine";
import { join } from "path-browserify";

const CURRENT_MVK_VERSION = "1.2.2";

export async function* checkAndDownloadMoltenVK(
  aria2: Aria2
): CommonUpdateProgram {
  if (
    (await fileOrDirExists("./moltenvk/libMoltenVK.dylib")) &&
    CURRENT_MVK_VERSION ===
      (await getKeyOrDefault("installed_moltenvk_version", "0.0.0"))
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
    CURRENT_DXVK_VERSION ===
    (await getKeyOrDefault("installed_dxvk_version", "0.0.0"))
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
  aria2: Aria2,
  wine: Wine
): CommonUpdateProgram {
  const arm64 = wine.attributes.architecture === "arm64";
  const version = arm64
    ? `${CURRENT_JADEITE_VERSION}-arm64-ready`
    : CURRENT_JADEITE_VERSION;
  if (version === (await getKeyOrDefault("installed_jadeite_version", ""))) {
    return;
  }

  const directory = resolve("./jadeite");
  const sha256 = arm64
    ? "13f9877dd7bf54287e5860fb9211d8667a3bb1ee4263bb0c0c6559f41dcd647b"
    : "12d4c37b09d3e81640536fd68c2c62913fc4b4a90c0183e4dec845e4934a9858";
  const archive = join(directory, `${sha256}.zip`);
  await mkdirp(directory);
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for await (const progress of aria2.doStreamingDownload({
    uri: arm64
      ? `https://web.aws.riverfog7.com/files/jadeite/v${version}.zip`
      : `https://codeberg.org/mkrsym1/jadeite/releases/download/v${version}/v${version}.zip`,
    checksum: `sha-256=${sha256}`,
    absDst: archive,
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

  await setKey("installed_jadeite_version", "installing");
  for await (const [dec, total] of doStreamUnzip(archive, directory)) {
    yield ["setProgress", (dec / total) * 100];
  }
  await setKey("installed_jadeite_version", version);
}

export const DXMT_FILES = ["d3d10core.dll", "d3d11.dll", "dxgi.dll"];

const DXMT_COMMIT = "654f547ffab4e0c395ee368aad52bb4586b04576";

export function getDXMTArchitecture(wine: Wine) {
  return wine.attributes.architecture === "arm64" ? "aarch64" : "x86_64";
}

export async function* checkAndDownloadDXMT(aria2: Aria2): CommonUpdateProgram {
  if (DXMT_COMMIT === (await getKeyOrDefault("installed_dxmt_version", ""))) {
    return;
  }

  const directory = resolve("./dxmt");
  const tag = `dxmt-${DXMT_COMMIT.slice(0, 7)}`;
  const archiveName = `dxmt-${DXMT_COMMIT}.zip`;
  const archivePath = resolve(archiveName);
  const tarPath = join(directory, `dxmt-${DXMT_COMMIT}.tar.gz`);
  yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
  for await (const progress of aria2.doStreamingDownload({
    uri: `https://github.com/yaagl/anime-game-wine/releases/download/${tag}/${archiveName}`,
    absDst: archivePath,
    checksum:
      "sha-256=fbc0721fb72ebafd2bad0dbdd3d13a52056fd10c4a9a699cee2689363823255b",
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

  await rmrf_dangerously(directory);
  await mkdirp(directory);
  await exec(["unzip", "-oq", archivePath, "-d", directory]);
  await exec(["tar", "-xzf", tarPath, "--strip-components=1", "-C", directory]);
  await removeFile(tarPath);
  await setKey("installed_dxmt_version", DXMT_COMMIT);
  await removeFile(archivePath);
}

const CURRENT_RESHADE_VERSION = "5.8.0";

export async function* checkAndDownloadReshade(
  aria2: Aria2,
  wine: Wine,
  gameDir: string
): CommonUpdateProgram {
  // D3DMetal does not inject ReShade; an enabled setting must not require it.
  if (wine.attributes.renderBackend === "d3dmetal") {
    return;
  }

  const reshaderDir = resolve("./reshade");

  if (
    CURRENT_RESHADE_VERSION ===
    (await getKeyOrDefault("installed_reshade", "0.0.0"))
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
