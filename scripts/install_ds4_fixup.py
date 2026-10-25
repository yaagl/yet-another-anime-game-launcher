#!/usr/bin/env python3
"""Install the local DS4 runtime into an existing YAAGL OS data directory."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import stat
import subprocess
import tempfile
import time

from diagnostics.ds4_registry import (
    SYNTHETIC_DS4_SUBTREES,
    inspect_registry,
    native_trial_registry,
)

SETTINGS = {"DisableHidraw": 0, "Enable SDL": 0, "KeepDS4BluetoothReportFixup": 1}
SERVICE = r"system\controlset001\services\winebus"
SECTIONS = re.compile(r"^\[([^\n]+)\][^\n]*\n.*?(?=^\[|\Z)", re.M | re.S)
REQUIRED_FILES = (
    "bin/wine", "bin/wineserver",
    "lib/wine/x86_64-unix/ntdll.so", "lib/wine/x86_64-unix/winebus.so",
    "lib/wine/x86_64-windows/winebus.sys", "lib/wine/i386-windows/winebus.sys",
)
RECEIPT = "ds4-fixup-install.json"


def digest(path):
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def atomic_write(path, text):
    mode = stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o600
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".ds4-")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            handle.write(text)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def save_json(path, value):
    atomic_write(path, json.dumps(value, indent=2) + "\n")


def key(section):
    return section[1].replace("\\\\", "\\").casefold()


def synthetic(section):
    prefix = "system\\controlset001\\enum\\"
    return any(key(section) == prefix + name.casefold() or
               key(section).startswith(prefix + name.casefold() + "\\")
               for name in SYNTHETIC_DS4_SUBTREES)


def registry_snapshot(text):
    native_trial_registry(text)  # Validate service count and DWORD types.
    service = next(s[0] for s in SECTIONS.finditer(text) if key(s) == SERVICE)
    values = {}
    for name in SETTINGS:
        matches = re.findall(rf'^"{re.escape(name)}"=[^\n]*$', service, re.M | re.I)
        if len(matches) > 1:
            raise ValueError("Duplicate winebus value: " + name)
        values[name] = matches[0] if matches else None
    return {"values": values, "synthetic_sections":
            [s[0] for s in SECTIONS.finditer(text) if synthetic(s)]}


def set_values(text, values):
    def replace(section):
        if key(section) != SERVICE:
            return section[0]
        body = section[0]
        for name, value in values.items():
            if name not in SETTINGS or (value is not None and not re.fullmatch(
                    rf'"{re.escape(name)}"=dword:[0-9a-f]{{8}}', value, re.I)):
                raise ValueError("Invalid saved winebus value")
            body = re.sub(rf'^"{re.escape(name)}"=[^\n]*\n?', "", body, flags=re.M | re.I)
            if value is not None:
                body = body.rstrip("\n") + "\n" + value + "\n\n"
        return body
    return SECTIONS.sub(replace, text)


def enable_fixup(text):
    registry_snapshot(text)
    return set_values(native_trial_registry(text, clear_synthetic=True),
                      {name: f'"{name}"=dword:{value:08x}' for name, value in SETTINGS.items()})


def restore_registry(text, snapshot):
    registry_snapshot(text)
    if set(snapshot["values"]) != set(SETTINGS):
        raise ValueError("Incomplete saved winebus values")
    for section in snapshot["synthetic_sections"]:
        match = SECTIONS.fullmatch(section)
        if match is None or not synthetic(match):
            raise ValueError("Backup contains an unrelated device section")
    result = SECTIONS.sub(lambda s: "" if synthetic(s) else s[0], text)
    return set_values(result, snapshot["values"]).rstrip("\n") + "\n\n" + "".join(snapshot["synthetic_sections"])


def inventory(runtime):
    files, links = {}, {}
    for path in sorted(runtime.rglob("*")):
        relative = path.relative_to(runtime).as_posix()
        if path.is_symlink():
            if not path.resolve().is_relative_to(runtime.resolve()) or not path.exists():
                raise ValueError("Runtime contains an external or broken symlink: " + relative)
            links[relative] = os.readlink(path)
        elif path.is_file():
            files[relative] = digest(path)
        elif not path.is_dir():
            raise ValueError("Unsupported runtime entry: " + relative)
    return {"files": files, "symlinks": links}


def verify_runtime(runtime, manifest):
    for relative in (*manifest["files"], *manifest["symlinks"]):
        path = Path(relative)
        if path.is_absolute() or ".." in path.parts or path.as_posix() != relative:
            raise ValueError("Invalid manifest path: " + relative)
    if not all(name in manifest["files"] for name in REQUIRED_FILES):
        raise ValueError("The package is not a complete Wine runtime")
    actual = inventory(runtime)
    if actual != {name: manifest[name] for name in actual}:
        raise ValueError("Runtime checksum or symlink verification failed")
    if not all(os.access(runtime / name, os.X_OK) for name in ("bin/wine", "bin/wineserver")):
        raise ValueError("Wine executables are not executable")
    if (runtime / "bin/wine64").exists():
        if not (runtime / "bin/wine64").samefile(runtime / "bin/wine"):
            raise ValueError("wine64 would override the packaged wine executable")


def wine_env(data):
    return {**os.environ, "WINEPREFIX": str(data / "wineprefix"), "WINEDEBUG": "-all,err+all"}


def ensure_idle(data):
    if (data / ".storage/patched.neustorage").exists():
        raise RuntimeError("Wait for YAAGL to finish reverting game patches, then close it.")
    processes = subprocess.check_output(["ps", "-axo", "pid=,command="], text=True)
    services = {"services.exe", "winedevice.exe", "explorer.exe", "rpcss.exe", "plugplay.exe"}
    for line in processes.splitlines():
        pid, command = line.strip().split(None, 1)
        if int(pid) == os.getpid():
            continue
        if "--path=" + str(data) in command:
            raise RuntimeError("Close YAAGL OS before updating its runtime.")
        executables = re.findall(r"([^\\/\s]+\.exe)(?:\s|$)", command, re.I)
        if not executables or all(name.lower() in services for name in executables):
            continue
        # Read only Wine process environments; never print or store their contents.
        environment = subprocess.run(["ps", "eww", "-p", pid, "-o", "command="],
                                     text=True, capture_output=True).stdout
        if re.search(r"(?:^| )WINEPREFIX=" + re.escape(str(data / "wineprefix")) +
                     r"(?= [A-Za-z_][A-Za-z0-9_]*=|$)", environment):
            raise RuntimeError("Close Windows applications in the YAAGL OS prefix first.")


def stop_prefix(data):
    server = str(data / "wine/bin/wineserver")
    result = subprocess.run([server, "-k"], env=wine_env(data), capture_output=True)
    if result.returncode not in (0, 1):  # 1 also means no server is running.
        raise RuntimeError("Could not stop the selected prefix's Wine server")
    subprocess.run([server, "-w"], env=wine_env(data), check=True, timeout=30)


def update_prefix(data, log):
    try:
        subprocess.run([str(data / "wine/bin/wine"), "wineboot", "-u"],
                       env=wine_env(data), stdout=log, stderr=subprocess.STDOUT,
                       check=True, timeout=180)
    finally:
        stop_prefix(data)


def check_target(data):
    for relative in ("wine", "wineprefix", "wineprefix/system.reg"):
        path = data / relative
        if not path.exists() or path.is_symlink() or not path.resolve().is_relative_to(data):
            raise ValueError("Expected an existing, local YAAGL installation: " + str(path))
    registry_snapshot((data / "wineprefix/system.reg").read_text())


def clone(source, destination):
    option = "-cR" if source.stat().st_dev == destination.parent.stat().st_dev else "-pR"
    subprocess.run(["/bin/cp", option, str(source), str(destination)], check=True)


def rollback(data, backup):
    record_path = backup / "record.json"
    record = json.loads(record_path.read_text())
    if record["data_dir"] != str(data) or backup.parent != data / "ds4-fixup-backups":
        raise ValueError("Backup belongs to another installation")
    if record["status"] == "rolled_back":
        print("This backup has already been restored.")
        return
    ensure_idle(data)
    if record["status"] == "installed":
        for name, expected in record["runtime_files"].items():
            if digest(data / "wine" / name) != expected:
                raise RuntimeError("Runtime changed after installation; inspect the backup before restoring.")
    if (data / "wine").exists():
        stop_prefix(data)
    if (backup / "runtime-original").exists():
        failed = backup / "runtime-replaced"
        if (data / "wine").exists():
            if failed.exists():
                raise RuntimeError("A previous rollback needs inspection: " + str(backup))
            (data / "wine").rename(failed)
        (backup / "runtime-original").rename(data / "wine")
    registry = data / "wineprefix/system.reg"
    atomic_write(registry, restore_registry(registry.read_text(), record["registry"]))
    with (backup / "rollback.log").open("a") as log:
        update_prefix(data, log)
    # wineboot may re-enumerate SDL devices; preserve the original value presence.
    atomic_write(registry, set_values(registry.read_text(), record["registry"]["values"]))
    record["status"] = "rolled_back"
    save_json(record_path, record)
    save_json(data / RECEIPT, {"backup": str(backup), "status": "rolled_back"})
    print("Previous runtime and controller settings restored. Backup:", backup)


def install(data, package):
    check_target(data)
    manifest = json.loads((package / "runtime-manifest.json").read_text())
    print("Verifying the complete runtime package...", flush=True)
    verify_runtime(package / "runtime", manifest)
    receipt_path = data / RECEIPT
    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text())
        if receipt["status"] != "rolled_back":
            raise RuntimeError("A DS4 installation already has a backup. Roll it back before reinstalling.")
    ensure_idle(data)
    stop_prefix(data)
    registry = data / "wineprefix/system.reg"
    snapshot = registry_snapshot(registry.read_text())
    parent = data / "ds4-fixup-backups"
    parent.mkdir(mode=0o700, exist_ok=True)
    backup = Path(tempfile.mkdtemp(prefix=time.strftime("%Y%m%d-%H%M%S-"), dir=parent))
    record = {"data_dir": str(data), "status": "prepared", "registry": snapshot,
              "runtime_files": {name: manifest["files"][name] for name in REQUIRED_FILES}}
    save_json(backup / "record.json", record)
    # Keep full registry snapshots for diagnosis only; rollback never imports them.
    for name in ("system.reg", "user.reg", "userdef.reg"):
        path = data / "wineprefix" / name
        if path.exists():
            (backup / name).write_bytes(path.read_bytes())
    staged = backup / "runtime-staged"
    clone(package / "runtime", staged)
    verify_runtime(staged, manifest)
    ensure_idle(data)
    stop_prefix(data)
    print("Installing runtime; rollback backup:", backup, flush=True)
    save_json(receipt_path, {"backup": str(backup), "status": "installing"})
    try:
        (data / "wine").rename(backup / "runtime-original")
        staged.rename(data / "wine")
        atomic_write(registry, enable_fixup(registry.read_text()))
        with (backup / "install.log").open("w") as log:
            update_prefix(data, log)
        audit = inspect_registry(registry.read_text())
        if audit["winebus"] != SETTINGS or audit["native_and_xinput_records"]:
            raise RuntimeError("Controller configuration did not persist")
        installed = data / "wineprefix/drive_c/windows/system32/drivers/winebus.sys"
        if digest(installed) != manifest["files"]["lib/wine/x86_64-windows/winebus.sys"]:
            raise RuntimeError("The prefix is still using a different winebus driver")
        record["status"] = "installed"
        save_json(backup / "record.json", record)
        save_json(receipt_path, {"backup": str(backup), "status": "installed"})
    except Exception:
        print("Installation failed; restoring the previous runtime...", flush=True)
        rollback(data, backup)
        raise
    print("Installed. Open YAAGL OS normally and choose Controller in Genshin if needed.")
    print("Rollback backup:", backup)
    return backup


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "rollback"))
    parser.add_argument("package", nargs="?", type=Path)
    parser.add_argument("--data-dir", type=Path,
                        default=Path.home() / "Library/Application Support/Yaagl OS")
    args = parser.parse_args()
    if platform.system() != "Darwin" or os.geteuid() == 0:
        parser.error("Run as your normal macOS user, without sudo.")
    if args.action == "install" and args.package is None:
        parser.error("install requires the unpacked package directory")
    data = args.data_dir.expanduser().resolve(strict=True)
    check_target(data)
    with (data / ".ds4-fixup.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        if args.action == "install":
            install(data, args.package.resolve(strict=True))
        else:
            receipt = json.loads((data / RECEIPT).read_text())
            rollback(data, Path(receipt["backup"]).resolve(strict=True))


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        raise SystemExit("DS4 installer: " + str(error))
