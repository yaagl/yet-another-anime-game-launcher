import { describe, expect, it } from "vitest";
import { findBlockedHostsEntries } from "./hosts";

describe("hosts diagnostics", () => {
  it("finds active hosts entries that block known launch domains", () => {
    expect(
      findBlockedHostsEntries(
        [
          "127.0.0.1 localhost",
          "# 0.0.0.0 globaldp-prod-cn01.juequling.com",
          "0.0.0.0 globaldp-prod-cn01.juequling.com",
          "127.0.0.1 globaldp-prod-os01.zenlesszonezero.com",
          "0.0.0.0 log-upload.mihoyo.com",
        ].join("\n"),
        [
          "globaldp-prod-cn01.juequling.com",
          "globaldp-prod-os01.zenlesszonezero.com",
        ]
      )
    ).toEqual([
      "0.0.0.0 globaldp-prod-cn01.juequling.com",
      "127.0.0.1 globaldp-prod-os01.zenlesszonezero.com",
    ]);
  });

  it("ignores comments, unrelated domains, and non-blocking hosts", () => {
    expect(
      findBlockedHostsEntries(
        [
          "# 0.0.0.0 globaldp-prod-cn01.juequling.com",
          "192.168.1.2 globaldp-prod-cn01.juequling.com",
          "0.0.0.0 log-upload.mihoyo.com",
        ].join("\n"),
        ["globaldp-prod-cn01.juequling.com"]
      )
    ).toEqual([]);
  });
});
