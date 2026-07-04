import { describe, expect, it } from "vitest";
import {
  buildWineEnvironmentVariables,
  DEBUG_WINEDEBUG,
  DEFAULT_WINEDEBUG,
} from "./wine";

describe("wine environment", () => {
  it("enables msync for dxmt distributions", () => {
    expect(
      buildWineEnvironmentVariables({
        prefix: "/tmp/prefix",
        attributes: { renderBackend: "dxmt" },
      })
    ).toEqual({
      WINEDEBUG: DEFAULT_WINEDEBUG,
      WINEPREFIX: "/tmp/prefix",
      WINEMSYNC: "1",
    });
  });

  it("allows launch diagnostics to override WINEDEBUG", () => {
    expect(
      buildWineEnvironmentVariables({
        prefix: "/tmp/prefix",
        attributes: { renderBackend: "dxmt" },
        env: { WINEDEBUG: DEBUG_WINEDEBUG },
      }).WINEDEBUG
    ).toBe(DEBUG_WINEDEBUG);
  });

  it("allows compatibility cleanup commands to suppress msync", () => {
    expect(
      buildWineEnvironmentVariables({
        prefix: "/tmp/prefix",
        attributes: { renderBackend: "dxmt" },
        env: { WINEMSYNC: "" },
      })
    ).toEqual({
      WINEDEBUG: DEFAULT_WINEDEBUG,
      WINEPREFIX: "/tmp/prefix",
      WINEMSYNC: "",
    });
  });
});
