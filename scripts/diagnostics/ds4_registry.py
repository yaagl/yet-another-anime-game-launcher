"""Read-only audit of DS4 v2 records in a Wine prefix; never starts Wine."""

import argparse
import json
from pathlib import Path
import re


SYNTHETIC_DS4_SUBTREES = (
    r"WINEBUS\VID_054C&PID_09CC",
    r"WINEXINPUT\VID_054C&PID_09CC&IG_00",
    r"WINEXINPUT\VID_054C&PID_09CC&XI_00",
    r"HID\VID_054C&PID_09CC&IG_00",
    r"HID\VID_054C&PID_09CC&XI_00",
)


def native_trial_registry(text, *, clear_synthetic=False):
    """Return B/C registry text for an offline clone; never write a prefix."""
    inspect_registry(text)  # Reject unexpected setting types before transforming.
    service = r"system\controlset001\services\winebus"
    synthetic = tuple(
        (r"system\controlset001\enum" + "\\" + key).casefold()
        for key in SYNTHETIC_DS4_SUBTREES
    )
    service_count = 0

    def replace(match):
        nonlocal service_count
        key = match[1].replace("\\\\", "\\").casefold()
        if clear_synthetic and any(key == x or key.startswith(x + "\\") for x in synthetic):
            return ""
        if key != service:
            return match[0]
        service_count += 1
        section = match[0]
        for name in ("DisableHidraw", "Enable SDL"):
            section = re.sub(rf'^"{re.escape(name)}"=[^\n]*\n?', "", section, flags=re.M | re.I)
            section = section.rstrip("\n") + f'\n"{name}"=dword:00000000\n\n'
        return section

    result = re.sub(r"^\[([^\n]+)\][^\n]*\n.*?(?=^\[|\Z)", replace, text, flags=re.M | re.S)
    if service_count != 1:
        raise ValueError("Expected exactly one winebus service section in the clone")
    return result


def inspect_registry(text):
    settings = {"DisableHidraw": 0, "Enable SDL": 1, "KeepDS4BluetoothReportFixup": 0}
    identities = set()
    for match in re.finditer(r"^\[([^\n]+)\][^\n]*\n(.*?)(?=^\[|\Z)", text, re.M | re.S):
        key = match[1].replace("\\\\", "\\")
        if key.casefold() == r"System\ControlSet001\Services\winebus".casefold():
            for name in settings:
                value = re.search(
                    rf'^"{re.escape(name)}"=dword:([0-9a-fA-F]{{8}})$',
                    match[2],
                    re.M | re.I,
                )
                if value:
                    settings[name] = int(value[1], 16)
                elif re.search(rf'^"{re.escape(name)}"=', match[2], re.M | re.I):
                    raise ValueError(f"Unexpected registry type for {name}")
        parts = key.upper().split("\\")
        if len(parts) >= 6 and parts[:3] == ["SYSTEM", "CONTROLSET001", "ENUM"]:
            bus, device = parts[3:5]
            if bus in {"BTHENUM", "HID", "WINEBUS", "WINEXINPUT"} and re.fullmatch(
                r"VID_054C&PID_09CC(?:&(?:IG|XI)_\d{2})?", device
            ):
                # Instance suffixes contain the Bluetooth address; omit them.
                identities.add(f"{bus}\\{device}")
    native = any(x in identities for x in (
        r"BTHENUM\VID_054C&PID_09CC", r"HID\VID_054C&PID_09CC"
    ))
    xinput = any(re.search(r"&(IG|XI)_\d{2}$", x) for x in identities)
    return {
        "winebus": settings,
        "sony_device_records": sorted(identities),
        "native_and_xinput_records": native and xinput,
        "note": "Saved records do not prove which devices are currently present or working.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("prefix", type=Path, help="Wine prefix containing system.reg")
    args = parser.parse_args()
    try:
        result = inspect_registry((args.prefix / "system.reg").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")
    print(json.dumps(result, indent=2))
