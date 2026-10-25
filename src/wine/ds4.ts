import { join } from "path-browserify";
import {
  build,
  exec,
  fileOrDirExists,
  generateRandomString,
  getKeyOrDefault,
  mkdirp,
  readFile,
  resolve,
  setKey,
  writeFile,
} from "@utils";
import type { WineDistribution } from "./distro";
import {
  DS4RegistryBackup,
  enableDS4Registry,
  restoreDS4Registry,
  setDS4RegistryValues,
  snapshotDS4Registry,
} from "./ds4-registry";

export const DS4_RUNTIME_ID = "11.0-dxmt-ds4-bluetooth-1";
const BUNDLE = "./sidecar/ds4-runtime";
const RECEIPT = "./ds4-runtime-install.json";
const CORE_FILES = [
  "bin/wine",
  "bin/wineserver",
  "lib/wine/x86_64-unix/ntdll.so",
  "lib/wine/x86_64-unix/winebus.so",
  "lib/wine/x86_64-windows/winebus.sys",
  "lib/wine/i386-windows/winebus.sys",
];

interface Manifest {
  id: string;
  archiveSha256: string;
  files: Record<string, string>;
}

interface Receipt {
  backup: string;
  previousTag: string;
  status: "prepared" | "installed" | "restored";
  registry: DS4RegistryBackup;
  files: Record<string, string>;
}

export async function getDS4Distribution(): Promise<WineDistribution | null> {
  const channel = String(import.meta.env["YAAGL_CHANNEL_CLIENT"]);
  if (!["hk4ecn", "hk4eos", "hk4euniversal"].includes(channel)) return null;
  if (
    !(await fileOrDirExists(resolve(`${BUNDLE}/manifest.json`))) &&
    (await getKeyOrDefault("wine_tag", "")) !== DS4_RUNTIME_ID
  ) {
    return null;
  }
  return {
    id: DS4_RUNTIME_ID,
    displayName: "Wine 11.0 DXMT (DS4 Bluetooth, experimental)",
    remoteUrl: resolve(`${BUNDLE}/runtime.tar.gz`),
    attributes: { renderBackend: "dxmt", winePath: "wine" },
  };
}

async function hash(path: string) {
  const result = await exec(["/usr/bin/shasum", "-a", "256", path]);
  const match = /^\\?([a-f0-9]{64})\s/i.exec(result.stdOut.trim());
  if (!match) throw new Error(`Could not hash ${path}`);
  return match[1].toLowerCase();
}

async function verifyFiles(runtime: string, files: Record<string, string>) {
  for (const name of CORE_FILES) {
    if (!/^[a-f0-9]{64}$/.test(files[name] ?? "")) {
      throw new Error(`Missing DS4 runtime checksum: ${name}`);
    }
    if ((await hash(join(runtime, name))) !== files[name]) {
      throw new Error(`DS4 runtime checksum mismatch: ${name}`);
    }
  }
  if (await fileOrDirExists(join(runtime, "bin/wine64"))) {
    await exec([
      "/bin/test",
      join(runtime, "bin/wine64"),
      "-ef",
      join(runtime, "bin/wine"),
    ]);
  }
}

async function atomicWrite(path: string, content: string) {
  const temporary = path + "." + generateRandomString(12);
  await writeFile(temporary, content);
  await exec(["/bin/chmod", "600", temporary]);
  await exec(["/bin/mv", "-f", temporary, path]);
}

async function saveReceipt(receipt: Receipt) {
  await atomicWrite(resolve(RECEIPT), JSON.stringify(receipt));
}

async function readReceipt(): Promise<Receipt | null> {
  if (!(await fileOrDirExists(resolve(RECEIPT)))) return null;
  const receipt: Receipt = JSON.parse(await readFile(RECEIPT));
  const parent = resolve("./ds4-runtime-backups") + "/";
  if (
    !receipt.backup.startsWith(parent) ||
    !/^[a-zA-Z0-9-]+$/.test(receipt.backup.slice(parent.length)) ||
    !["prepared", "installed", "restored"].includes(receipt.status)
  ) {
    throw new Error("Invalid DS4 runtime backup");
  }
  return receipt;
}

function wineEnvironment(prefix: string) {
  return { WINEPREFIX: prefix, WINEDEBUG: "-all,err+all" };
}

async function ensureIdle(prefix: string) {
  if (await fileOrDirExists(resolve("./.storage/patched.neustorage"))) {
    throw new Error(
      "Close the game and let YAAGL finish reverting patches first."
    );
  }
  const processes = (await exec(["/bin/ps", "-axo", "pid=,command="])).stdOut;
  const dataPath = prefix
    .slice(0, -"/wineprefix".length)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const launcher = new RegExp(`--path=${dataPath}(?=\\s|$)`);
  if (processes.split("\n").filter(line => launcher.test(line)).length > 1) {
    throw new Error("Close other YAAGL windows using this installation first.");
  }
  for (const line of processes.split("\n")) {
    const process = /^\s*(\d+)\s+(.+)$/.exec(line);
    if (!process) continue;
    const executables = [
      ...process[2].matchAll(/([^\\/\s]+\.exe)(?:\s|$)/gi),
    ].map(x => x[1].toLowerCase());
    if (
      !executables.length ||
      executables.every(x =>
        [
          "services.exe",
          "winedevice.exe",
          "explorer.exe",
          "rpcss.exe",
          "plugplay.exe",
        ].includes(x)
      )
    )
      continue;
    // Process environments are inspected only for Wine applications and never logged.
    const result = await Neutralino.os.execCommand(
      build(["/bin/ps", "eww", "-p", process[1], "-o", "command="]),
      {}
    );
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      new RegExp(
        `(?:^| )WINEPREFIX=${escaped}(?= [A-Za-z_][A-Za-z0-9_]*=|$)`
      ).test(result.stdOut)
    ) {
      throw new Error("Close Windows applications in this YAAGL prefix first.");
    }
  }
}

async function stopPrefix(prefix: string) {
  const server = resolve("./wine/bin/wineserver");
  const result = await Neutralino.os.execCommand(
    build([server, "-k"], wineEnvironment(prefix)),
    {}
  );
  if (![0, 1].includes(result.exitCode)) throw new Error("Could not stop Wine");
  await exec([server, "-w"], wineEnvironment(prefix));
}

async function updatePrefix(prefix: string, log: string) {
  try {
    await exec(
      [resolve("./wine/bin/wine"), "wineboot", "-u"],
      wineEnvironment(prefix),
      false,
      log
    );
  } finally {
    await stopPrefix(prefix);
  }
}

async function rollback(prefix: string, receipt: Receipt) {
  await ensureIdle(prefix);
  if (await fileOrDirExists(resolve("./wine"))) await stopPrefix(prefix);
  const registry = join(prefix, "system.reg");
  const restored = restoreDS4Registry(
    await readFile(registry),
    receipt.registry
  );
  const original = join(receipt.backup, "wine-original");
  if (await fileOrDirExists(original)) {
    if (receipt.status === "installed") {
      await verifyFiles(resolve("./wine"), receipt.files);
    }
    if (await fileOrDirExists(resolve("./wine"))) {
      await exec([
        "/bin/mv",
        resolve("./wine"),
        join(receipt.backup, "wine-replaced"),
      ]);
    }
    await exec(["/bin/mv", original, resolve("./wine")]);
  }
  await atomicWrite(registry, restored);
  await updatePrefix(prefix, join(receipt.backup, "rollback.log"));
  await atomicWrite(
    registry,
    setDS4RegistryValues(await readFile(registry), receipt.registry.values)
  );
  receipt.status = "restored";
  await saveReceipt(receipt);
  await setKey("wine_tag", receipt.previousTag);
  await setKey("wine_state", "ready");
  await setKey("wine_update_tag", null);
  await setKey("wine_update_url", null);
}

export async function installDS4Runtime(prefix: string) {
  if (prefix !== resolve("./wineprefix"))
    throw new Error("Unexpected Wine prefix");
  const previous = await readReceipt();
  if (previous?.status === "installed") {
    await verifyFiles(resolve("./wine"), previous.files);
    return;
  }
  if (previous?.status === "prepared") await rollback(prefix, previous);
  if (!(await fileOrDirExists(join(prefix, "system.reg")))) {
    throw new Error(
      "Install the standard Wine environment before selecting DS4 Bluetooth."
    );
  }
  const manifest: Manifest = JSON.parse(
    await readFile(`${BUNDLE}/manifest.json`)
  );
  if (
    manifest.id !== DS4_RUNTIME_ID ||
    !/^[a-f0-9]{64}$/.test(manifest.archiveSha256) ||
    (await hash(resolve(`${BUNDLE}/runtime.tar.gz`))) !== manifest.archiveSha256
  ) {
    throw new Error(
      "The bundled DS4 runtime is missing or damaged. Reinstall YAAGL."
    );
  }
  await ensureIdle(prefix);
  await stopPrefix(prefix);
  const registry = join(prefix, "system.reg");
  const receipt: Receipt = {
    backup: resolve(
      `./ds4-runtime-backups/${Date.now()}-${generateRandomString(12)}`
    ),
    previousTag: await getKeyOrDefault("wine_tag", ""),
    status: "prepared",
    registry: snapshotDS4Registry(await readFile(registry)),
    files: manifest.files,
  };
  await mkdirp(receipt.backup);
  await exec(["/bin/chmod", "700", receipt.backup]);
  await exec([
    "/usr/bin/tar",
    "-xzf",
    resolve(`${BUNDLE}/runtime.tar.gz`),
    "-C",
    receipt.backup,
  ]);
  const staged = join(receipt.backup, "wine");
  await verifyFiles(staged, manifest.files);
  await ensureIdle(prefix);
  await stopPrefix(prefix);
  receipt.registry = snapshotDS4Registry(await readFile(registry));
  await saveReceipt(receipt);
  try {
    await exec([
      "/bin/mv",
      resolve("./wine"),
      join(receipt.backup, "wine-original"),
    ]);
    await exec(["/bin/mv", staged, resolve("./wine")]);
    await atomicWrite(registry, enableDS4Registry(await readFile(registry)));
    await updatePrefix(prefix, join(receipt.backup, "install.log"));
    const current = await readFile(registry);
    const actual = snapshotDS4Registry(current);
    const expected = snapshotDS4Registry(enableDS4Registry(current));
    if (
      JSON.stringify(actual.values) !== JSON.stringify(expected.values) ||
      actual.devices.length !== 0
    ) {
      throw new Error("The native DS4 controller settings did not persist");
    }
    if (
      (await hash(
        join(prefix, "drive_c/windows/system32/drivers/winebus.sys")
      )) !== manifest.files["lib/wine/x86_64-windows/winebus.sys"]
    ) {
      throw new Error("The prefix did not load the bundled winebus driver");
    }
    receipt.status = "installed";
    await saveReceipt(receipt);
  } catch (error) {
    await rollback(prefix, receipt);
    throw error;
  }
}

export async function restoreDS4Runtime(prefix: string, requestedTag: string) {
  if (prefix !== resolve("./wineprefix"))
    throw new Error("Unexpected Wine prefix");
  const receipt = await readReceipt();
  if (!receipt || receipt.status === "restored") return false;
  await rollback(prefix, receipt);
  return requestedTag === receipt.previousTag;
}
