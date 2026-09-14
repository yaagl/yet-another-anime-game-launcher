import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Config } from "@config";
import type { Wine } from "@wine";
import type { Server } from "@constants";

function unexpected(..._args: unknown[]): never {
  throw new Error("Unexpected fixture operation");
}

async function unexpectedAsync(..._args: unknown[]): Promise<void> {
  unexpected(..._args);
}

async function unexpectedBoolean(..._args: unknown[]): Promise<boolean> {
  return unexpected(..._args);
}

interface Fixture {
  root: string;
  keys: Map<string, string>;
  cp: (source: string, destination: string) => Promise<void>;
  forceMove: (source: string, destination: string) => Promise<void>;
  removeFile: (path: string) => Promise<void>;
  removeFileIfExists: (path: string) => Promise<void>;
  fileOrDirExists: (path: string) => Promise<boolean>;
  mkdirp: (path: string) => Promise<void>;
  resolve: (path: string) => string;
}

const fixture: Fixture = {
  root: "",
  keys: new Map<string, string>(),
  cp: unexpectedAsync,
  forceMove: unexpectedAsync,
  removeFile: unexpectedAsync,
  removeFileIfExists: unexpectedAsync,
  fileOrDirExists: unexpectedBoolean,
  mkdirp: unexpectedAsync,
  resolve: path => path,
};

vi.mock("@utils", () => ({
  writeBinary: unexpectedAsync,
  forceMove: (source: string, destination: string) =>
    fixture.forceMove(source, destination),
  removeFile: (path: string) => fixture.removeFile(path),
  log: unexpected,
  getKey: async (key: string) => {
    const value = fixture.keys.get(key);
    if (value === undefined) throw new Error(`Missing key: ${key}`);
    return value;
  },
  setKey: (key: string, value: string | null) => {
    if (value === null) fixture.keys.delete(key);
    else fixture.keys.set(key, value);
  },
  cp: (source: string, destination: string) => fixture.cp(source, destination),
  resolve: (path: string) => fixture.resolve(path),
  removeFileIfExists: (path: string) => fixture.removeFileIfExists(path),
  fileOrDirExists: (path: string) => fixture.fileOrDirExists(path),
  getKeyOrDefault: async (key: string, defaultValue: string) =>
    fixture.keys.get(key) ?? defaultValue,
  mkdirp: (path: string) => fixture.mkdirp(path),
  xdelta3: unexpectedAsync,
}));

vi.mock("./unity", () => ({
  disableUnityFeature: async (_path: string) => new ArrayBuffer(0),
}));

vi.mock("src/downloadable-resource", () => ({
  DXMT_FILES: ["d3d10core.dll", "d3d11.dll", "dxgi.dll"],
  DXVK_FILES: [],
}));

import { patchProgram, patchRevertProgram } from "./patch";

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function write(path: string, content: string) {
  const target = join(fixture.root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

async function prepareFixture() {
  await Promise.all([
    write("wine/lib/wine/x86_64-windows/d3d10core.dll", "builtin-d3d10core"),
    write("wine/lib/wine/x86_64-windows/d3d11.dll", "builtin-d3d11"),
    write("wine/lib/wine/x86_64-windows/dxgi.dll", "builtin-dxgi"),
    write("wine/lib/wine/x86_64-windows/winemetal.dll", "built-in-winemetal"),
    write("wine/lib/wine/x86_64-unix/winemetal.so", "built-in-winemetal-so"),
    write("dxmt/d3d10core.dll", "dxmt-d3d10core"),
    write("dxmt/d3d11.dll", "dxmt-d3d11"),
    write("dxmt/dxgi.dll", "dxmt-dxgi"),
    write("dxmt/winemetal.dll", "dxmt-winemetal"),
    write("dxmt/winemetal.so", "dxmt-winemetal-so"),
    write("reshade/dxgi.dll", "reshade-dxgi"),
    write("reshade/d3dcompiler_47.dll", "reshade-d3dcompiler"),
    write("sidecar/protonextras/steam64.exe", "steam64"),
    write("sidecar/protonextras/steam32.exe", "steam32"),
    write("sidecar/protonextras/lsteamclient64.dll", "steamclient64"),
    write("sidecar/protonextras/lsteamclient32.dll", "steamclient32"),
    write("game/dxgi.dll", "game-dxgi"),
    write("game/d3dcompiler_47.dll", "game-d3dcompiler"),
    write("prefix/drive_c/windows/system32/winemetal.dll", "prefix-winemetal"),
    write("prefix/drive_c/windows/syswow64/steam.exe", "old-steam32"),
  ]);
}

function server(): Server {
  return {
    id: "hk4eos",
    update_url: "",
    adv_url: "",
    cps: "",
    channel_id: 0,
    subchannel_id: 0,
    removed: [],
    product_name: "",
    executable: "",
    dataDir: "",
    THE_REAL_COMPANY_NAME: "",
    added: [],
    patched: [],
    hosts: "",
  };
}

const rendererConfig: Config = {
  blockNet: false,
  hk4eEnableHDR: false,
  patchOff: true,
  resolutionCustom: false,
  resolutionWidth: "",
  resolutionHeight: "",
  steamPatch: false,
  timeoutFix: false,
  workaround3: false,
  fpsUnlock: "default",
  leftCmd: false,
  metalHud: false,
  proxyEnabled: false,
  proxyHost: "",
  reshade: true,
  retina: false,
  wineDistro: "",
};

describe("renderer patching", () => {
  beforeEach(async () => {
    fixture.root = await mkdtemp(join(tmpdir(), "yaagl-patch-"));
    fixture.keys.clear();
    fixture.cp = (source, destination) =>
      copyFile(fixture.resolve(source), fixture.resolve(destination));
    fixture.forceMove = rename;
    fixture.removeFile = rm;
    fixture.removeFileIfExists = async path => {
      await rm(path, { force: true });
    };
    fixture.fileOrDirExists = exists;
    fixture.mkdirp = async path => {
      await mkdir(path, { recursive: true });
    };
    fixture.resolve = path =>
      path.startsWith("/") ? path : join(fixture.root, path);
    await prepareFixture();
  });

  afterEach(async () => {
    await rm(fixture.root, { recursive: true, force: true });
  });

  it("keeps a composed D3DMetal runtime and game renderer files intact", async () => {
    const wine = {
      prefix: join(fixture.root, "prefix"),
      attributes: { renderBackend: "d3dmetal" },
    } as Wine;
    const config = rendererConfig;

    for await (const _ of patchProgram(
      join(fixture.root, "game"),
      wine,
      server(),
      config
    )) {
      await Promise.resolve(_);
    }

    expect(
      await readFile(
        join(fixture.root, "wine/lib/wine/x86_64-windows/d3d11.dll"),
        "utf8"
      )
    ).toBe("builtin-d3d11");
    expect(
      await readFile(
        join(fixture.root, "wine/lib/wine/x86_64-windows/winemetal.dll"),
        "utf8"
      )
    ).toBe("built-in-winemetal");
    expect(
      await readFile(
        join(fixture.root, "prefix/drive_c/windows/system32/winemetal.dll"),
        "utf8"
      )
    ).toBe("prefix-winemetal");
    expect(await readFile(join(fixture.root, "game/dxgi.dll"), "utf8")).toBe(
      "game-dxgi"
    );
    expect(
      await readFile(join(fixture.root, "game/d3dcompiler_47.dll"), "utf8")
    ).toBe("game-d3dcompiler");
    expect(
      await readFile(
        join(fixture.root, "prefix/drive_c/windows/system32/steam.exe"),
        "utf8"
      )
    ).toBe("steam64");
    expect(
      await readFile(
        join(fixture.root, "prefix/drive_c/windows/syswow64/steam.exe"),
        "utf8"
      )
    ).toBe("steam32");
    expect(
      await exists(
        join(fixture.root, "wine/lib/wine/x86_64-windows/d3d11.dll.bak")
      )
    ).toBe(false);

    for await (const _ of patchRevertProgram(
      join(fixture.root, "game"),
      wine,
      server(),
      config
    )) {
      await Promise.resolve(_);
    }

    expect(await readFile(join(fixture.root, "game/dxgi.dll"), "utf8")).toBe(
      "game-dxgi"
    );
    expect(
      await readFile(join(fixture.root, "game/d3dcompiler_47.dll"), "utf8")
    ).toBe("game-d3dcompiler");
  });

  it("continues injecting DXMT for renderers without D3DMetal", async () => {
    const wine = {
      prefix: join(fixture.root, "prefix"),
      attributes: {},
    } as Wine;
    const config = rendererConfig;

    for await (const _ of patchProgram(
      join(fixture.root, "game"),
      wine,
      server(),
      config
    )) {
      await Promise.resolve(_);
    }

    expect(
      await readFile(
        join(fixture.root, "wine/lib/wine/x86_64-windows/d3d11.dll"),
        "utf8"
      )
    ).toBe("dxmt-d3d11");
    expect(
      await readFile(
        join(fixture.root, "wine/lib/wine/x86_64-windows/d3d11.dll.bak"),
        "utf8"
      )
    ).toBe("builtin-d3d11");
    expect(await readFile(join(fixture.root, "game/dxgi.dll"), "utf8")).toBe(
      "reshade-dxgi"
    );

    for await (const _ of patchRevertProgram(
      join(fixture.root, "game"),
      wine,
      server(),
      config
    )) {
      await Promise.resolve(_);
    }

    expect(
      await readFile(
        join(fixture.root, "wine/lib/wine/x86_64-windows/d3d11.dll"),
        "utf8"
      )
    ).toBe("builtin-d3d11");
  });
});
