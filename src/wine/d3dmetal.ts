import type { Aria2 } from "@aria2";
import { join } from "path-browserify";
import {
  exec,
  fileOrDirExists,
  generateRandomString,
  mkdirp,
  readFile,
  removeFile,
  resolve,
} from "@utils";

export const D3DMETAL_RUNTIME_ID = "wine-11.17-d3dmetal-gptk4.0b2-1";
export const D3DMETAL_ARCHIVE_NAME =
  "wine-11.17-d3dmetal-gptk4.0b2-macos26.tar.xz";
export const D3DMETAL_RUNTIME_URL = `https://github.com/dbc-hbin/wine-yaagl-d3dmetal/releases/download/wine-11.17-gptk4.0b2-1/${D3DMETAL_ARCHIVE_NAME}`;
// Archive and helper pins are from the independently published Wine release.
export const D3DMETAL_ARCHIVE_SHA256 =
  "8ca960dc85cf1c6407e620a7eccbe100be83bed46b4686358b8f2f8f44ea4517";
export const D3DMETAL_ARCHIVE_SIZE = 237642832;
export const D3DMETAL_HELPER_SHA256 =
  "a8659e11ac8bacdc9c0b58922e295874bbf80fdcb9057b011ae06e5a9b60e1ae";
export const D3DMETAL_BUILD_MANIFEST_SHA256 =
  "481b42d3bc21318243f7b146b5d88d3b9fc4487befab46df1dbe5c76f58cc11e";
export const D3DMETAL_RUNTIME_MANIFEST_SHA256 =
  "8f34be58f0ddcc5bcb6e1a7418fba3edb9a8c50079609aaae093b5e527b83c2c";
export const D3DMETAL_SIDECAR_SHA256 =
  "e5e69f05c069bafd242759e86c64332de005be8bccdd6d9c882f379ece16f75f";

const OFFICIAL_RELEASE =
  "https://github.com/dbc-hbin/d3dmetal-redistributable/releases/download/gptk-4.0b2";
const LICENSE_SHA256 =
  "5abb2d059be217663b00e8fd37e14411d374e11d17e3b744eebd49b8d17118c8";
const FRAMEWORK_SHA256 =
  "ebd6be389eb34576b4158accf9e785ad58f9a2ef3c4ca03f4d188a85c1338637";
const SIGNED_SIDECAR_SHA256 = D3DMETAL_SIDECAR_SHA256;
const CONVERTER_SHA256 =
  "5c5619ef17a7d62e84db0a7f5181d746623b47364379271fd5827e6bd961ba34";
const REQUIRED_WINDOWS = [
  "d3d10.dll",
  "d3d11.dll",
  "d3d12.dll",
  "dxgi.dll",
  "nvapi64.dll",
  "nvngx.dll",
];
const REQUIRED_UNIX = [
  "d3d10.so",
  "d3d11.so",
  "d3d12.so",
  "dxgi.so",
  "nvapi64.so",
  "nvngx.so",
];
const HELPER_RELATIVE = "libexec/yaagl-d3dmetal/prepare-d3dmetal-runtime";
const SIDECAR_RELATIVE = "libexec/yaagl-d3dmetal/libYaaglNativePsoCache.dylib";
const BUILD_MANIFEST_RELATIVE = "libexec/yaagl-d3dmetal/build-manifest.json";

export async function sha256File(path: string): Promise<string> {
  const output = (
    await exec(["/usr/bin/shasum", "-a", "256", path])
  ).stdOut.trim();
  const hash = /^([a-f0-9]{64})\s/i.exec(output);
  if (!hash) throw new Error(`Could not hash D3DMetal artifact: ${path}`);
  return hash[1].toLowerCase();
}

export async function assertFileHash(path: string, expected: string) {
  if (
    !/^[a-f0-9]{64}$/.test(expected) ||
    (await sha256File(path)) !== expected
  ) {
    throw new Error(`D3DMetal artifact SHA-256 mismatch: ${path}`);
  }
}

export async function verifyD3DMetalArchive(path: string) {
  const size = Number(
    (await exec(["/usr/bin/stat", "-f", "%z", path])).stdOut.trim()
  );
  if (!D3DMETAL_ARCHIVE_SIZE || size !== D3DMETAL_ARCHIVE_SIZE) {
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

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid D3DMetal preparation manifest");
  }
  return value as Record<string, unknown>;
}

export async function verifyD3DMetalInventory(wineRoot: string) {
  const manifestPath = join(wineRoot, "yaagl-d3dmetal-runtime.json");
  await assertFileHash(manifestPath, D3DMETAL_RUNTIME_MANIFEST_SHA256);
  const manifest = record(JSON.parse(await readFile(manifestPath)));
  const framework = record(manifest.framework);
  const autopatch = record(manifest.autopatch);
  if (
    manifest.schemaVersion !== 1 ||
    manifest.runtimeId !== D3DMETAL_RUNTIME_ID ||
    manifest.archiveRoot !== "wine" ||
    framework.included !== false ||
    framework.destination !== "lib/external/D3DMetal.framework" ||
    autopatch.directory !== "libexec/yaagl-d3dmetal" ||
    autopatch.manifestSha256 !== D3DMETAL_BUILD_MANIFEST_SHA256 ||
    autopatch.helperSha256 !== D3DMETAL_HELPER_SHA256 ||
    autopatch.sidecarSha256 !== D3DMETAL_SIDECAR_SHA256 ||
    !Array.isArray(manifest.entries)
  ) {
    throw new Error("D3DMetal Wine runtime inventory contract mismatch");
  }
  const inventory = new Map<string, Record<string, unknown>>();
  let previous = "";
  for (const item of manifest.entries) {
    const entry = record(item);
    const path = entry.path;
    if (
      typeof path !== "string" ||
      !path ||
      path.startsWith("/") ||
      path
        .split("/")
        .some(segment => !segment || segment === "." || segment === "..") ||
      path <= previous ||
      path.startsWith("lib/external/D3DMetal.framework/")
    ) {
      throw new Error("Invalid D3DMetal Wine runtime inventory path");
    }
    if (entry.type === "file") {
      if (
        !Number.isSafeInteger(entry.size) ||
        Number(entry.size) < 0 ||
        typeof entry.sha256 !== "string" ||
        !/^[a-f0-9]{64}$/.test(entry.sha256)
      ) {
        throw new Error("Invalid D3DMetal Wine runtime file inventory");
      }
    } else if (entry.type === "symlink") {
      if (typeof entry.target !== "string" || !entry.target) {
        throw new Error("Invalid D3DMetal Wine runtime symlink inventory");
      }
    } else {
      throw new Error("Invalid D3DMetal Wine runtime entry type");
    }
    inventory.set(path, entry);
    previous = path;
  }
  const required = [
    "bin/wine",
    "lib/external/libd3dshared.dylib",
    HELPER_RELATIVE,
    SIDECAR_RELATIVE,
    BUILD_MANIFEST_RELATIVE,
    ...REQUIRED_WINDOWS.map(file => `lib/wine/x86_64-windows/${file}`),
    ...REQUIRED_UNIX.map(file => `lib/wine/x86_64-unix/${file}`),
  ];
  for (const path of required) {
    const entry = inventory.get(path);
    if (!entry)
      throw new Error(`Missing D3DMetal Wine inventory entry: ${path}`);
    const target = join(wineRoot, path);
    if (entry.type === "file") {
      const size = Number(
        (await exec(["/usr/bin/stat", "-f", "%z", target])).stdOut.trim()
      );
      if (size !== entry.size)
        throw new Error(`D3DMetal Wine file size mismatch: ${path}`);
      await assertFileHash(target, String(entry.sha256));
    } else {
      const actual = (await exec(["/usr/bin/readlink", target])).stdOut.trim();
      if (actual !== entry.target)
        throw new Error(`D3DMetal Wine symlink mismatch: ${path}`);
    }
  }
}

export async function verifyD3DMetalHelper(wineRoot: string) {
  const helper = join(wineRoot, HELPER_RELATIVE);
  const sidecar = join(wineRoot, SIDECAR_RELATIVE);
  const buildManifestPath = join(wineRoot, BUILD_MANIFEST_RELATIVE);
  await Promise.all([
    assertFileHash(helper, D3DMETAL_HELPER_SHA256),
    assertFileHash(sidecar, D3DMETAL_SIDECAR_SHA256),
    assertFileHash(buildManifestPath, D3DMETAL_BUILD_MANIFEST_SHA256),
  ]);
  const manifest = record(JSON.parse(await readFile(buildManifestPath)));
  const artifacts = record(manifest.artifacts);
  const helperArtifact = record(artifacts.helper);
  const sidecarArtifact = record(artifacts.sidecar);
  if (
    manifest.schema !== 1 ||
    manifest.target !== "arm64-apple-macos26.0" ||
    helperArtifact.file !== "prepare-d3dmetal-runtime" ||
    helperArtifact.sha256 !== D3DMETAL_HELPER_SHA256 ||
    sidecarArtifact.file !== "libYaaglNativePsoCache.dylib" ||
    sidecarArtifact.sha256 !== D3DMETAL_SIDECAR_SHA256
  ) {
    throw new Error("D3DMetal helper build provenance mismatch");
  }
  await exec(["/usr/bin/codesign", "--verify", "--strict", helper]);
  await exec(["/usr/bin/codesign", "--verify", "--strict", sidecar]);
}

export async function validatePreparedD3DMetalWine(wineRoot: string) {
  await verifyD3DMetalInventory(wineRoot);
  const output = join(wineRoot, "lib/external");
  const framework = join(output, "D3DMetal.framework");
  const manifest = record(
    JSON.parse(await readFile(join(output, "prepared-d3dmetal.json")))
  );
  const source = record(manifest.source);
  const sourceFramework = record(source.frameworkAsset);
  const sourceLicense = record(source.licenseAsset);
  const frameworkRecord = record(manifest.framework);
  const sidecarRecord = record(manifest.nativePsoSidecar);
  const converterRecord = record(manifest.metalIrConverter);
  if (
    manifest.schema !== 2 ||
    manifest.licenseAcceptance !== "explicit-cli-flag" ||
    source.repository !==
      "https://github.com/dbc-hbin/d3dmetal-redistributable" ||
    source.tag !== "gptk-4.0b2" ||
    sourceFramework.name !== "D3DMetal.framework-4.0b2.zip" ||
    sourceFramework.sha256 !==
      "61ff2bb920376ce58709cabb081a5b5e7948c778939dbe66bfa0edca7c2f0d68" ||
    sourceLicense.name !== "License.rtf" ||
    sourceLicense.sha256 !== LICENSE_SHA256 ||
    frameworkRecord.version !== "4.0b2" ||
    frameworkRecord.compositeMode !== "patched-signed" ||
    frameworkRecord.finalD3DMetalSha256 !== FRAMEWORK_SHA256 ||
    frameworkRecord.signature !== "adhoc" ||
    converterRecord.patchMode !== "patched" ||
    converterRecord.signature !== "adhoc" ||
    converterRecord.fp64SignedSha256 !== CONVERTER_SHA256 ||
    sidecarRecord.signedSha256 !== SIGNED_SIDECAR_SHA256 ||
    sidecarRecord.dependency !==
      "@loader_path/Resources/libYaaglNativePsoCache.dylib" ||
    sidecarRecord.signature !== "adhoc"
  ) {
    throw new Error("Prepared D3DMetal runtime contract mismatch");
  }
  for (const [path, hash] of [
    [join(framework, "Versions/A/D3DMetal"), FRAMEWORK_SHA256],
    [
      join(framework, "Versions/A/Resources/libmetalirconverter.dylib"),
      converterRecord.fp64SignedSha256,
    ],
    [
      join(framework, "Versions/A/Resources/libYaaglNativePsoCache.dylib"),
      SIGNED_SIDECAR_SHA256,
    ],
    [join(output, "License.rtf"), LICENSE_SHA256],
  ] as const) {
    if (typeof hash !== "string")
      throw new Error("Missing D3DMetal artifact hash");
    await assertFileHash(path, hash);
  }
  await exec([
    "/usr/bin/codesign",
    "--verify",
    "--deep",
    "--strict",
    framework,
  ]);
  for (const lib of REQUIRED_WINDOWS) {
    if (
      !(await fileOrDirExists(join(wineRoot, "lib/wine/x86_64-windows", lib)))
    ) {
      throw new Error(`Missing D3DMetal Wine PE component: ${lib}`);
    }
  }
  for (const lib of REQUIRED_UNIX) {
    if (!(await fileOrDirExists(join(wineRoot, "lib/wine/x86_64-unix", lib)))) {
      throw new Error(`Missing D3DMetal Wine Unix component: ${lib}`);
    }
  }
  if (!(await fileOrDirExists(join(output, "libd3dshared.dylib")))) {
    throw new Error("Missing D3DMetal shared library");
  }
  await verifyD3DMetalHelper(wineRoot);
}

export async function prepareD3DMetalWine(wineRoot: string) {
  await verifyD3DMetalInventory(wineRoot);
  await verifyD3DMetalHelper(wineRoot);
  const output = join(wineRoot, "lib/external");
  if (await fileOrDirExists(join(output, "D3DMetal.framework"))) {
    throw new Error(
      "Core Wine archive must not include a prepatched D3DMetal framework"
    );
  }
  const prepared = join(wineRoot, ".prepared-d3dmetal");
  await exec([
    join(wineRoot, HELPER_RELATIVE),
    "--output",
    prepared,
    "--cache",
    resolve("./d3dmetal-native-cache"),
    "--accept-apple-license",
  ]);
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
  await validatePreparedD3DMetalWine(wineRoot);
}
