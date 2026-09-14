import { afterEach, describe, expect, it, vi } from "vitest";
import type { Config } from "@config";
import type { Server } from "../../../constants";
import type { Wine } from "../../../wine";

vi.mock("../../../utils", () => ({
  mkdirp: vi.fn(),
  removeFile: vi.fn(),
  writeBinary: vi.fn(),
  writeFile: vi.fn(),
  readBinary: vi.fn(),
  resolve: (path: string) => path,
  utf16le: (value: string) => new TextEncoder().encode(value),
  log: vi.fn(),
  exec: vi.fn(),
  getKeyOrDefault: vi.fn(),
}));

vi.mock("../patch", () => ({
  putLocal: vi.fn(),
  patchProgram: async function* () {
    return;
  },
  patchRevertProgram: async function* () {
    return;
  },
}));

import { writeFile } from "../../../utils";
import { launchGameProgram } from "./program-launch-game";

const TARGET_WINE_ID =
  "11.17-zzz-dx12-tuned-stage-parallel-cache-warmup-cursor-rollback-gptk4b2-arm64server";
const GAME_DIR = "/games/ZenlessZoneZero";
const GAME_EXECUTABLE = "ZenlessZoneZero.exe";
const SERVER: Server = {
  id: "nap_global",
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
const COMMAND_RESULT: Neutralino.os.ExecCommandResult = {
  pid: 0,
  stdOut: "",
  stdErr: "",
  exitCode: 0,
};
const BASE_CONFIG = {
  blockNet: false,
  fpsUnlock: "default",
  hk4eEnableHDR: false,
  leftCmd: false,
  metalHud: false,
  patchOff: false,
  proxyEnabled: false,
  proxyHost: "",
  reshade: false,
  retina: false,
  resolutionCustom: false,
  resolutionHeight: "1080",
  resolutionWidth: "1920",
  steamPatch: false,
  timeoutFix: false,
  wineDistro: TARGET_WINE_ID,
  workaround3: false,
} satisfies Config;

function createWine(id: string, renderBackend: "dxmt" | "d3dmetal") {
  const exec2 = vi.fn(async (): Promise<Neutralino.os.ExecCommandResult> => {
    return COMMAND_RESULT;
  });
  return {
    exec2,
    wine: {
      id,
      attributes: { renderBackend },
      cmd: async (): Promise<Neutralino.os.ExecCommandResult> => COMMAND_RESULT,
      exec: async (): Promise<never> => {
        throw new Error("registry is unavailable");
      },
      exec2,
      waitUntilServerOff: async (): Promise<Neutralino.os.ExecCommandResult> =>
        COMMAND_RESULT,
      toWinePath: (path: string) => `Z:${path}`,
      prefix: "/prefix",
      openCmdWindow: async (): Promise<Neutralino.os.ExecCommandResult> =>
        COMMAND_RESULT,
      setProps: async (): Promise<void> => {
        return;
      },
      setNVExtension: async (): Promise<void> => {
        return;
      },
    } satisfies Wine,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("NAP launch program", () => {
  it("adds -use-d3d12 to the exact Wine runtime's normal launch batch file", async () => {
    const { wine } = createWine(TARGET_WINE_ID, "d3dmetal");
    const config = { ...BASE_CONFIG } satisfies Config;

    for await (const _ of launchGameProgram({
      gameDir: GAME_DIR,
      gameExecutable: GAME_EXECUTABLE,
      wine,
      config,
      server: SERVER,
    })) {
      void _;
    }

    expect(writeFile).toHaveBeenCalledWith(
      expect.stringMatching(/config\.bat$/),
      expect.stringContaining(
        '"Z:/games/ZenlessZoneZero/ZenlessZoneZero.exe" -use-d3d12'
      )
    );
  });

  it("passes -use-d3d12 to Steam only for the exact Wine runtime", async () => {
    const exact = createWine(TARGET_WINE_ID, "d3dmetal");
    const other = createWine("another-d3dmetal-runtime", "d3dmetal");
    const config = {
      ...BASE_CONFIG,
      resolutionCustom: true,
      steamPatch: true,
    } satisfies Config;

    for await (const _ of launchGameProgram({
      gameDir: GAME_DIR,
      gameExecutable: GAME_EXECUTABLE,
      wine: exact.wine,
      config,
      server: SERVER,
    })) {
      void _;
    }
    for await (const _ of launchGameProgram({
      gameDir: GAME_DIR,
      gameExecutable: GAME_EXECUTABLE,
      wine: other.wine,
      config,
      server: SERVER,
    })) {
      void _;
    }

    expect(exact.exec2).toHaveBeenCalledWith(
      "C:\\windows\\system32\\steam.exe",
      ["Z:/games/ZenlessZoneZero/ZenlessZoneZero.exe", "-use-d3d12"],
      expect.any(Object),
      expect.any(String)
    );
    expect(other.exec2).toHaveBeenCalledWith(
      "C:\\windows\\system32\\steam.exe",
      ["Z:/games/ZenlessZoneZero/ZenlessZoneZero.exe"],
      expect.any(Object),
      expect.any(String)
    );
  });
});
