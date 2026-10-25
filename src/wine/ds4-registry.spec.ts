import { describe, expect, it } from "vitest";
import {
  enableDS4Registry,
  restoreDS4Registry,
  snapshotDS4Registry,
} from "./ds4-registry";

export const registry = `WINE REGISTRY Version 2

[System\\\\ControlSet001\\\\Services\\\\winebus] 123
"DisableHidraw"=dword:00000001
"OtherSetting"=dword:00000004

[System\\\\ControlSet001\\\\Enum\\\\WINEXINPUT\\\\VID_054C&PID_09CC&IG_00\\\\device] 123
"Name"="Synthetic DS4"

[System\\\\ControlSet001\\\\Enum\\\\HID\\\\VID_045E&PID_028E\\\\device] 123
"Name"="Other controller"

`;

describe("DS4 registry migration", () => {
  it("enables native input and preserves unrelated controllers and settings", () => {
    const result = enableDS4Registry(registry);
    expect(snapshotDS4Registry(result).values).toEqual({
      DisableHidraw: '"DisableHidraw"=dword:00000000',
      "Enable SDL": '"Enable SDL"=dword:00000000',
      KeepDS4BluetoothReportFixup:
        '"KeepDS4BluetoothReportFixup"=dword:00000001',
    });
    expect(result).not.toContain("Synthetic DS4");
    expect(result).toContain('"Name"="Other controller"');
    expect(result).toContain('"OtherSetting"=dword:00000004');
    expect(enableDS4Registry(result)).toBe(result);
  });

  it("restores original value presence without reverting later unrelated changes", () => {
    const saved = snapshotDS4Registry(registry);
    const current = enableDS4Registry(registry).replace(
      '"OtherSetting"=dword:00000004',
      '"OtherSetting"=dword:00000009'
    );
    const restored = restoreDS4Registry(current, saved);
    expect(snapshotDS4Registry(restored)).toEqual(saved);
    expect(restored).toContain('"OtherSetting"=dword:00000009');
    expect(restored).toContain('"Name"="Other controller"');
  });

  it("rejects ambiguous values, missing service keys and unrelated backup sections", () => {
    expect(() =>
      snapshotDS4Registry(
        registry.replace(
          '"DisableHidraw"=dword:00000001',
          '"DisableHidraw"=dword:00000001\n"disablehidraw"=dword:00000000'
        )
      )
    ).toThrow();
    expect(() =>
      snapshotDS4Registry(registry.replace("winebus", "other"))
    ).toThrow();
    expect(() =>
      enableDS4Registry(
        registry.replace(
          '"DisableHidraw"=dword:00000001',
          '"DisableHidraw"="yes"'
        )
      )
    ).toThrow();
    const backup = snapshotDS4Registry(registry);
    backup.devices.push('[Unrelated]\n"Value"="overwrite"\n');
    expect(() => restoreDS4Registry(registry, backup)).toThrow();
  });
});
