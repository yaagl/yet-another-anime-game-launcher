import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadExternalRuntime,
  parseExternalRuntimeConfig,
} from "./external-runtime";

const config = {
  version: 1,
  prefix: "/isolated/prefix",
  command: ["/provider/bridge", "literal $(no-shell)"],
  distribution: {
    id: "arm64",
    displayName: "ARM64 Wine",
    remoteUrl: "",
    attributes: { renderBackend: "dxmt" },
  },
  ownsGraphicsLibraries: true,
  ownerPidEnvironment: "LAUNCHER_PID",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("external Wine provider", () => {
  it("accepts an OS-allocated download port and rejects invalid TCP ports", async () => {
    const execCommand = vi.fn(async () => ({
      exitCode: 0,
      stdOut: '{"port":49172}',
      stdErr: "",
      pid: 1,
    }));
    vi.stubGlobal("Neutralino", {
      os: {
        getEnv: async (key: string) =>
          key === "LAUNCHER_PID" ? "42" : "/runtime.json",
        execCommand,
      },
      filesystem: { readFile: async () => JSON.stringify(config) },
    });
    const runtime = await loadExternalRuntime();
    if (!runtime) throw new Error("Expected configured runtime");
    expect(await runtime.getDownloadPort()).toBe(49172);
    execCommand.mockResolvedValueOnce({
      exitCode: 0,
      stdOut: '{"port":65536}',
      stdErr: "",
      pid: 1,
    });
    await expect(runtime.getDownloadPort()).rejects.toThrow(
      "invalid download RPC port"
    );
  });
  it("leaves the default launcher untouched when not configured", async () => {
    const readFile = vi.fn();
    vi.stubGlobal("Neutralino", {
      os: { getEnv: async () => "" },
      filesystem: { readFile },
    });
    expect(await loadExternalRuntime()).toBeUndefined();
    expect(readFile).not.toHaveBeenCalled();
  });

  it.each([
    { ...config, version: 2 },
    { ...config, prefix: "relative" },
    { ...config, command: [] },
    { ...config, command: ["relative"] },
    { ...config, ownerPidEnvironment: "PID;command" },
    { ...config, distribution: {} },
  ])("rejects malformed configuration before executing the provider", value => {
    expect(() => parseExternalRuntimeConfig(value)).toThrow("Invalid external");
  });

  it("keeps JSON and command arguments literal and propagates provider errors", async () => {
    const execCommand = vi.fn(async (_command: string, _options: object) => ({
      exitCode: 0,
      stdOut: "",
      stdErr: "",
      pid: 1,
    }));
    vi.stubGlobal("Neutralino", {
      os: {
        getEnv: async (key: string) =>
          key === "LAUNCHER_PID" ? "42" : "/runtime.json",
        execCommand,
      },
      filesystem: { readFile: async () => JSON.stringify(config) },
    });
    const runtime = await loadExternalRuntime();
    if (!runtime) throw new Error("Expected configured runtime");
    await runtime.runner.exec("cmd", ["argument with space", "$(literal)"]);
    const command = execCommand.mock.calls[0][0];
    expect(command).toContain("\\$\\(no-shell\\)");
    expect(command).toContain("\\$\\(literal\\)");
    execCommand.mockResolvedValueOnce({
      exitCode: 1,
      stdOut: "",
      stdErr: "provider failed",
      pid: 1,
    });
    await expect(runtime.runner.waitUntilServerOff()).rejects.toThrow(
      "provider failed"
    );
  });
});
