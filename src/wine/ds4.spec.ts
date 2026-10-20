import { createHash } from "crypto";
import { posix } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DS4_RUNTIME_ID,
  getDS4Distribution,
  installDS4Runtime,
  restoreDS4Runtime,
} from "./ds4";
import { snapshotDS4Registry } from "./ds4-registry";

const files = new Map<string, string>();
const storage = new Map<string, string>();
const core = [
  "bin/wine",
  "bin/wineserver",
  "lib/wine/x86_64-unix/ntdll.so",
  "lib/wine/x86_64-unix/winebus.so",
  "lib/wine/x86_64-windows/winebus.sys",
  "lib/wine/i386-windows/winebus.sys",
];
const prefix = "/trial/wineprefix";
const registryPath = prefix + "/system.reg";
const originalRegistry = `WINE REGISTRY Version 2
[System\\\\ControlSet001\\\\Services\\\\winebus] 1
"DisableHidraw"=dword:00000001
"OtherSetting"=dword:00000004

`;
let failBoot = false;
let failSwap = false;
let busy = false;
let duplicateLauncher = false;
let serial = 0;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const resolve = (path: string) => posix.resolve("/trial", path);
const exists = (path: string) =>
  files.has(path) || [...files.keys()].some(x => x.startsWith(path + "/"));
const read = (path: string) => {
  const value = files.get(path);
  if (value === undefined) throw new Error("Missing: " + path);
  return value;
};

vi.mock("@utils", () => ({
  resolve: (path: string) => resolve(path),
  generateRandomString: () => `nonce${++serial}`,
  fileOrDirExists: async (path: string) => exists(resolve(path)),
  readFile: async (path: string) => read(resolve(path)),
  writeFile: async (path: string, value: string) => {
    files.set(resolve(path), value);
  },
  mkdirp: async (path: string) => {
    files.set(path, "directory");
  },
  getKeyOrDefault: async (key: string, fallback: string) =>
    storage.get(key) ?? fallback,
  setKey: async (key: string, value: string | null) => {
    if (value === null) storage.delete(key);
    else storage.set(key, value);
  },
  build: (args: string[], env: Record<string, string>) =>
    JSON.stringify({ args, env }),
  exec: async (args: string[], env?: Record<string, string>) => {
    let stdOut = "";
    if (args[0] === "/usr/bin/shasum") {
      stdOut = `${digest(read(args[3]))}  ${args[3]}`;
    } else if (args[0] === "/usr/bin/tar") {
      for (const name of core)
        files.set(`${args[4]}/wine/${name}`, "candidate:" + name);
    } else if (args[0] === "/bin/mv") {
      const [source, destination] = args.slice(-2);
      if (
        failSwap &&
        source.endsWith("/wine") &&
        destination === "/trial/wine"
      ) {
        failSwap = false;
        throw new Error("Injected runtime swap failure");
      }
      if (!exists(source)) throw new Error("Missing move source: " + source);
      for (const [name, value] of [...files]) {
        if (name === source || name.startsWith(source + "/")) {
          files.delete(name);
          files.set(destination + name.slice(source.length), value);
        }
      }
    } else if (args[0] === "/trial/wine/bin/wine") {
      expect(env?.WINEPREFIX).toBe(prefix);
      if (failBoot) {
        failBoot = false;
        throw new Error("Injected wineboot failure");
      }
      files.set(
        prefix + "/drive_c/windows/system32/drivers/winebus.sys",
        read("/trial/wine/lib/wine/x86_64-windows/winebus.sys")
      );
    } else if (args[0] === "/trial/wine/bin/wineserver") {
      expect(env?.WINEPREFIX).toBe(prefix);
    } else if (args[0] === "/bin/ps") {
      stdOut = duplicateLauncher
        ? "1 Yaagl --path=/trial\n2 Yaagl --path=/trial"
        : busy
        ? "42 C:\\game\\GenshinImpact.exe"
        : "";
    } else if (args[0] === "/bin/test") {
      throw new Error("Unexpected wine64 overrides wine");
    } else if (args[0] !== "/bin/chmod") {
      throw new Error("Unexpected command: " + args.join(" "));
    }
    return { exitCode: 0, stdOut, stdErr: "", pid: 1 };
  },
}));

beforeEach(() => {
  files.clear();
  storage.clear();
  failBoot = failSwap = busy = duplicateLauncher = false;
  serial = 0;
  import.meta.env["YAAGL_CHANNEL_CLIENT"] = "hk4eos";
  for (const name of core) files.set("/trial/wine/" + name, "original:" + name);
  files.set(registryPath, originalRegistry);
  storage.set("wine_tag", "original-runtime");
  files.set("/trial/sidecar/ds4-runtime/runtime.tar.gz", "archive");
  files.set(
    "/trial/sidecar/ds4-runtime/manifest.json",
    JSON.stringify({
      id: DS4_RUNTIME_ID,
      archiveSha256: digest("archive"),
      files: Object.fromEntries(
        core.map(name => [name, digest("candidate:" + name)])
      ),
    })
  );
  vi.stubGlobal("Neutralino", {
    os: {
      execCommand: async (command: string) => {
        const { args, env } = JSON.parse(command);
        if (args[0].endsWith("wineserver")) expect(env.WINEPREFIX).toBe(prefix);
        return {
          exitCode: 0,
          stdOut:
            args[0] === "/bin/ps"
              ? "game WINEPREFIX=/trial/wineprefix X=1"
              : "",
        };
      },
    },
  });
});

describe("bundled DS4 runtime integration", () => {
  it("offers the runtime only to Genshin with a bundle or an installed DS4 runtime", async () => {
    expect((await getDS4Distribution())?.id).toBe(DS4_RUNTIME_ID);
    import.meta.env["YAAGL_CHANNEL_CLIENT"] = "hkrpgos";
    expect(await getDS4Distribution()).toBeNull();
    import.meta.env["YAAGL_CHANNEL_CLIENT"] = "hk4eos";
    files.delete("/trial/sidecar/ds4-runtime/manifest.json");
    expect(await getDS4Distribution()).toBeNull();
    storage.set("wine_tag", DS4_RUNTIME_ID);
    expect((await getDS4Distribution())?.id).toBe(DS4_RUNTIME_ID);
  });

  it("installs the complete runtime, then restores the previous one with later registry changes intact", async () => {
    await installDS4Runtime(prefix);
    for (const name of core)
      expect(read("/trial/wine/" + name)).toBe("candidate:" + name);
    expect(
      snapshotDS4Registry(read(registryPath)).values.KeepDS4BluetoothReportFixup
    ).toBe('"KeepDS4BluetoothReportFixup"=dword:00000001');
    await installDS4Runtime(prefix); // Interrupted storage updates can retry safely.
    files.set(registryPath, read(registryPath).replace("00000004", "00000009"));
    expect(await restoreDS4Runtime(prefix, "original-runtime")).toBe(true);
    for (const name of core)
      expect(read("/trial/wine/" + name)).toBe("original:" + name);
    expect(snapshotDS4Registry(read(registryPath))).toEqual(
      snapshotDS4Registry(originalRegistry)
    );
    expect(read(registryPath)).toContain('"OtherSetting"=dword:00000009');
    expect(storage.get("wine_tag")).toBe("original-runtime");
  });

  it.each(["boot", "swap"])(
    "rolls back a failed %s without losing the existing prefix",
    async failure => {
      failBoot = failure === "boot";
      failSwap = failure === "swap";
      await expect(installDS4Runtime(prefix)).rejects.toThrow("Injected");
      for (const name of core)
        expect(read("/trial/wine/" + name)).toBe("original:" + name);
      expect(snapshotDS4Registry(read(registryPath))).toEqual(
        snapshotDS4Registry(originalRegistry)
      );
      expect(storage.get("wine_state")).toBe("ready");
    }
  );

  it("rejects a corrupt bundle and an active game before replacing the runtime", async () => {
    files.set("/trial/sidecar/ds4-runtime/runtime.tar.gz", "corrupt");
    await expect(installDS4Runtime(prefix)).rejects.toThrow("damaged");
    files.set("/trial/sidecar/ds4-runtime/runtime.tar.gz", "archive");
    busy = true;
    await expect(installDS4Runtime(prefix)).rejects.toThrow("Close Windows");
    expect(read("/trial/wine/bin/wine")).toBe("original:bin/wine");
    expect(read(registryPath)).toBe(originalRegistry);
  });

  it("refuses rollback over a runtime changed after installation", async () => {
    await installDS4Runtime(prefix);
    files.set("/trial/wine/bin/wine", "another runtime");
    await expect(restoreDS4Runtime(prefix, "original-runtime")).rejects.toThrow(
      "checksum mismatch"
    );
    expect(read("/trial/wine/bin/wine")).toBe("another runtime");
  });

  it("rejects another launcher using the same installation", async () => {
    duplicateLauncher = true;
    await expect(installDS4Runtime(prefix)).rejects.toThrow(
      "Close other YAAGL"
    );
    expect(read("/trial/wine/bin/wine")).toBe("original:bin/wine");
    expect(read(registryPath)).toBe(originalRegistry);
  });
});
