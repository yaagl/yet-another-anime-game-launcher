import { eq } from "semver";
import { Aria2 } from "./aria2";
import { CommonUpdateProgram } from "./common-update-ui";
import {
  mkdirp,
  humanFileSize,
  setKey,
  readBinary,
  resolve,
  writeBinary,
  doStreamUnzip,
  forceMove,
  writeFile,
  getKeyOrDefault,
} from "./utils";
import { join } from "path-browserify";
import { Wine } from "./wine";

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
