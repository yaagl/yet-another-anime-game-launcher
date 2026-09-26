import type { Aria2 } from "@aria2";
import { join } from "path-browserify";
import {
  exec,
  fileOrDirExists,
  generateRandomString,
  mkdirp,
  removeFile,
  resolve,
} from "@utils";

export const D3DMETAL_RUNTIME_ID = "wine-11.17-d3dmetal-gptk4.0b2-2";
export const D3DMETAL_ARCHIVE_NAME =
  "wine-11.17-d3dmetal-gptk4.0b2-macos26.tar.xz";
export const D3DMETAL_RUNTIME_URL = `https://github.com/dbc-hbin/wine-yaagl-d3dmetal/releases/download/wine-11.17-gptk4.0b2-2/${D3DMETAL_ARCHIVE_NAME}`;
// Pins from the independently published Wine release.
export const D3DMETAL_ARCHIVE_SHA256 =
  "4cb7fec41c0b78d23dd5d3b16f3f50e4ce1e463b5c05dec8dedca1943a5a7b64";
export const D3DMETAL_ARCHIVE_SIZE = 237641872;
const D3DMETAL_HELPER_SHA256 =
  "633878945623dccdde46737857cae4b630f925d98deafe4401fb9def386eb093";
const OFFICIAL_RELEASE =
  "https://github.com/dbc-hbin/d3dmetal-redistributable/releases/download/gptk-4.0b2";
const LICENSE_SHA256 =
  "5abb2d059be217663b00e8fd37e14411d374e11d17e3b744eebd49b8d17118c8";

async function sha256File(path: string): Promise<string> {
  const output = (
    await exec(["/usr/bin/shasum", "-a", "256", path])
  ).stdOut.trim();
  const hash = /^([a-f0-9]{64})\s/i.exec(output);
  if (!hash) throw new Error(`Could not hash D3DMetal artifact: ${path}`);
  return hash[1].toLowerCase();
}

async function assertFileHash(path: string, expected: string) {
  if ((await sha256File(path)) !== expected) {
    throw new Error(`D3DMetal artifact SHA-256 mismatch: ${path}`);
  }
}

export async function verifyD3DMetalArchive(path: string) {
  const size = Number(
    (await exec(["/usr/bin/stat", "-f", "%z", path])).stdOut.trim()
  );
  if (size !== D3DMETAL_ARCHIVE_SIZE) {
    throw new Error("D3DMetal Wine archive size mismatch");
  }
  await assertFileHash(path, D3DMETAL_ARCHIVE_SHA256);
}

export async function loadD3DMetalLicense(aria2: Aria2): Promise<string> {
  const directory = resolve("./d3dmetal-license");
  const license = join(directory, "License.rtf");
  await mkdirp(directory);
  if (
    !(await fileOrDirExists(license)) ||
    (await sha256File(license)) !== LICENSE_SHA256
  ) {
    const downloaded = join(
      directory,
      `License.${generateRandomString(16)}.rtf`
    );
    try {
      for await (const _ of aria2.doStreamingDownload({
        uri: `${OFFICIAL_RELEASE}/License.rtf`,
        absDst: downloaded,
      })) {
        /* License is small; UI remains in loading state. */
      }
      await assertFileHash(downloaded, LICENSE_SHA256);
      await exec(["/bin/mv", "-f", downloaded, license]);
    } finally {
      if (await fileOrDirExists(downloaded)) await removeFile(downloaded);
    }
  }
  await assertFileHash(license, LICENSE_SHA256);
  const text = (
    await exec(["/usr/bin/textutil", "-convert", "txt", "-stdout", license])
  ).stdOut;
  if (!text.trim())
    throw new Error("Verified Apple license converted to empty text");
  return text;
}

export async function prepareD3DMetalWine(wineRoot: string) {
  const helper = join(
    wineRoot,
    "libexec/yaagl-d3dmetal/prepare-d3dmetal-runtime"
  );
  await assertFileHash(helper, D3DMETAL_HELPER_SHA256);
  await exec(["/usr/bin/codesign", "--verify", "--strict", helper]);
  const output = join(wineRoot, "lib/external");
  const prepared = join(wineRoot, ".prepared-d3dmetal");
  await exec([
    helper,
    "--output",
    prepared,
    "--cache",
    resolve("./d3dmetal-native-cache"),
    "--accept-apple-license",
  ]);
  // The native helper validates its inputs, signatures and finished output
  // before publishing the prepared directory.
  for (const name of [
    "D3DMetal.framework",
    "prepared-d3dmetal.json",
    "License.rtf",
    "Acknowledgements.rtf",
    "SHA256SUMS",
  ]) {
    await exec(["/bin/mv", join(prepared, name), join(output, name)]);
  }
  await exec(["/bin/rmdir", prepared]);
}
