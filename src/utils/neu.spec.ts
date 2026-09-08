import { describe, expect, it } from "vitest";
import { buildExecCommand, formatExecFailure } from "./neu";

describe("exec diagnostics", () => {
  it("redirects to log file unless teeOutput is enabled", () => {
    expect(
      buildExecCommand(["echo", "hello"], {}, { logFile: "/tmp/yaagl.log" })
    ).toBe("echo hello &> /tmp/yaagl.log");

    expect(
      buildExecCommand(
        ["echo", "hello"],
        {},
        { logFile: "/tmp/yaagl.log", teeOutput: true }
      )
    ).toBe("echo hello");
  });

  it("includes phase and log file in failure details", () => {
    const message = formatExecFailure({
      pid: 123,
      exitCode: 5,
      stdOut: "",
      stdErr: "boom",
      command: "wine game.exe",
      phase: "nap.launch.steam-patch",
      logFile: "/tmp/game.log",
      cwd: "/Users/example/Library/Application Support/Yaagl ZZZ",
      envDiff: "{ WINEPREFIX=/tmp/prefix, WINEMSYNC=1 }",
      startedAt: "2026-07-04T06:00:00.000Z",
      endedAt: "2026-07-04T06:00:01.000Z",
    });

    expect(message).toContain("Command return non-zero code (5)");
    expect(message).toContain("Phase: nap.launch.steam-patch");
    expect(message).toContain("LogFile: /tmp/game.log");
    expect(message).toContain(
      "Cwd: /Users/example/Library/Application Support/Yaagl ZZZ"
    );
    expect(message).toContain(
      "EnvDiff: { WINEPREFIX=/tmp/prefix, WINEMSYNC=1 }"
    );
    expect(message).toContain("StdErr:\nboom");
  });
});
