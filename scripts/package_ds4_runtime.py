#!/usr/bin/env python3
"""Package a complete, already-built DS4 Wine runtime for build-app.js."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

RUNTIME_ID = "11.0-dxmt-ds4-bluetooth-1"
CORE_FILES = (
    "bin/wine", "bin/wineserver",
    "lib/wine/x86_64-unix/ntdll.so", "lib/wine/x86_64-unix/winebus.so",
    "lib/wine/x86_64-windows/winebus.sys", "lib/wine/i386-windows/winebus.sys",
)


def sha256(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def package(runtime, output):
    runtime = runtime.resolve(strict=True)
    output = output.resolve()
    if output.is_relative_to(runtime):
        raise ValueError("The output must be outside the Wine runtime")
    if output.exists():
        raise ValueError("Use a new output directory; existing packages are preserved")
    if not all((runtime / name).is_file() for name in CORE_FILES):
        raise ValueError("Supply a complete Wine runtime, not replacement DLLs")
    if (runtime / "dosdevices").exists() or (runtime / "system.reg").exists():
        raise ValueError("A Wine prefix must never be included in this package")
    for path in runtime.rglob("*"):
        if path.is_symlink() and (
            not path.resolve().is_relative_to(runtime) or not path.exists()
        ):
            raise ValueError("External or broken runtime symlink: " + str(path))
    for name in CORE_FILES[-2:]:
        if "KeepDS4BluetoothReportFixup".encode("utf-16-le") not in (runtime / name).read_bytes():
            raise ValueError("winebus is missing the DS4 Bluetooth patch: " + name)
    for name in CORE_FILES[:2]:
        if not os.access(runtime / name, os.X_OK):
            raise ValueError("Wine loader/server must be executable")
    if (runtime / "bin/wine64").exists() and not (runtime / "bin/wine64").samefile(runtime / "bin/wine"):
        raise ValueError("wine64 would override the packaged Wine loader")
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".ds4-package-", dir=output.parent) as tmp:
        temporary = Path(tmp)
        # tar follows only this command-line directory link, preserving internal links.
        (temporary / "wine").symlink_to(runtime, target_is_directory=True)
        archive = temporary / "runtime.tar.gz"
        subprocess.run(
            ["/usr/bin/tar", "-czHf", str(archive), "-C", str(temporary), "wine"],
            check=True, env={**os.environ, "COPYFILE_DISABLE": "1"},
        )
        manifest = {
            "id": RUNTIME_ID,
            "archiveSha256": sha256(archive),
            "files": {name: sha256(runtime / name) for name in CORE_FILES},
        }
        (temporary / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        (temporary / "wine").unlink()
        output.mkdir()
        archive.rename(output / archive.name)
        (temporary / "manifest.json").rename(output / "manifest.json")
    print("Packaged DS4 runtime:", output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runtime", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    package(args.runtime, args.output)
