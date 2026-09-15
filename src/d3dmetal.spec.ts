import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  exec,
  fileOrDirExists,
  forceMove,
  rmrf_dangerously,
  setKey,
} from "@utils";
import { installD3DMetalFromDMG } from "./d3dmetal";

vi.mock("@utils", () => ({
  exec: vi.fn(),
  fileOrDirExists: vi.fn(),
  forceMove: vi.fn(),
  rmrf_dangerously: vi.fn(),
  setKey: vi.fn(),
  log: vi.fn(),
  resolve: (path: string) => path.replace("./", "/launcher/"),
}));

const lib = "/launcher/wine/lib";
let files: Map<string, string>;
let failMove: string;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("Neutralino", {
    filesystem: {
      readDirectory: vi.fn().mockResolvedValue([
        {
          entry: "Evaluation environment for Windows games 4.0 beta 2.dmg",
          type: "FILE",
        },
      ]),
    },
  });
  failMove = "";
  files = new Map([
    [`${lib}/external`, "original external"],
    [`${lib}/wine`, "original wine"],
    ["/Volumes/GPTK & Test/redist/lib", "source"],
    ["/Volumes/GPTK & Test/redist/lib/external", "new external"],
    ["/Volumes/GPTK & Test/redist/lib/wine", "new wine"],
  ]);
  vi.mocked(fileOrDirExists).mockImplementation(async path => files.has(path));
  vi.mocked(exec).mockImplementation(async args => {
    if (args[0] === "ditto")
      files.set(String(args[2]), files.get(String(args[1])) ?? "");
    return {
      exitCode: 0,
      pid: 1,
      stdErr: "",
      stdOut: "<key>mount-point</key><string>/Volumes/GPTK &amp; Test</string>",
    };
  });
  vi.mocked(forceMove).mockImplementation(async (source, target) => {
    if (source === failMove) throw new Error("move failed");
    files.set(target, files.get(source) ?? "");
    files.delete(source);
    return { exitCode: 0, pid: 1, stdErr: "", stdOut: "" };
  });
  vi.mocked(rmrf_dangerously).mockImplementation(async path => {
    files.delete(path);
    return { exitCode: 0, pid: 1, stdErr: "", stdOut: "" };
  });
});

async function install() {
  for await (const step of installD3DMetalFromDMG("/inputs/GPTK.dmg"))
    void step;
}

describe("D3DMetal import", () => {
  it("opens the nested evaluation DMG and detaches inner before outer", async () => {
    vi.mocked(exec).mockImplementationOnce(async () => ({
      exitCode: 0,
      pid: 1,
      stdErr: "",
      stdOut:
        "<key>mount-point</key><string>/Volumes/Game Porting Toolkit</string>",
    }));
    await install();
    expect(exec).toHaveBeenCalledWith([
      "hdiutil",
      "attach",
      "/Volumes/Game Porting Toolkit/Evaluation environment for Windows games 4.0 beta 2.dmg",
      "-nobrowse",
      "-readonly",
      "-plist",
    ]);
    const detaches = vi
      .mocked(exec)
      .mock.calls.filter(([args]) => args[1] === "detach");
    expect(detaches.map(([args]) => args[2])).toEqual([
      "/Volumes/GPTK & Test",
      "/Volumes/Game Porting Toolkit",
    ]);
    expect(files.get(`${lib}/wine`)).toBe("new wine");
  });
  it("imports into bundled Wine and keeps original backups", async () => {
    await install();
    expect(files.get(`${lib}/external`)).toBe("new external");
    expect(files.get(`${lib}/wine`)).toBe("new wine");
    expect(files.get(`${lib}/wine.old`)).toBe("original wine");
    expect(exec).toHaveBeenCalledWith([
      "hdiutil",
      "detach",
      "/Volumes/GPTK & Test",
      "-quiet",
    ]);
    expect(setKey).toHaveBeenCalledWith("hkrpg_d3dmetal_installed", "true");
  });

  it("leaves both original directories intact when the first rename fails", async () => {
    failMove = `${lib}/external`;
    await expect(install()).rejects.toThrow("move failed");
    expect(files.get(`${lib}/external`)).toBe("original external");
    expect(files.get(`${lib}/wine`)).toBe("original wine");
    expect(setKey).not.toHaveBeenCalled();
  });

  it("rolls back the first replacement when the second rename fails", async () => {
    failMove = `${lib}/wine`;
    await expect(install()).rejects.toThrow("move failed");
    expect(files.get(`${lib}/external`)).toBe("original external");
    expect(files.get(`${lib}/wine`)).toBe("original wine");
  });

  it("does not replace Wine if the DMG payload is incomplete", async () => {
    files.delete("/Volumes/GPTK & Test/redist/lib/wine");
    await expect(install()).rejects.toThrow("missing redist/lib/wine");
    expect(forceMove).not.toHaveBeenCalled();
    expect(files.get(`${lib}/external`)).toBe("original external");
  });
});
