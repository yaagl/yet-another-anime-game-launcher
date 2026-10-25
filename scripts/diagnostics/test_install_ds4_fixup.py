import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import install_ds4_fixup as installer


def section(name, body=""):
    return "[" + name.replace("\\", "\\\\") + "] 123\n" + body + "\n\n"


BASE = ("WINE REGISTRY Version 2\n\n" +
        section(r"System\ControlSet001\Services\winebus",
                '"DisableHidraw"=dword:00000001\n"Unrelated"="keep"') +
        section(r"System\ControlSet001\Enum\HID\VID_054C&PID_09CC&IG_00\old",
                '"DeviceDesc"="old synthetic"') +
        section(r"System\ControlSet001\Enum\HID\VID_045E&PID_028E\other",
                '"DeviceDesc"="other controller"'))
NEW_SETTING = section(r"Software\Example", '"SavedAfterInstall"="preserve"')


class InstallTests(unittest.TestCase):
    def test_rollback_restores_absent_values_and_preserves_later_unrelated_changes(self):
        snapshot = installer.registry_snapshot(BASE)
        updated = installer.enable_fixup(BASE)
        self.assertNotIn("old synthetic", updated)
        self.assertIn("other controller", updated)
        self.assertEqual(installer.inspect_registry(updated)["winebus"], installer.SETTINGS)
        restored = installer.restore_registry(updated + NEW_SETTING, snapshot)
        self.assertIn(NEW_SETTING, restored)
        self.assertIn('"Unrelated"="keep"', restored)
        self.assertEqual(installer.registry_snapshot(restored), snapshot)
        self.assertNotIn('"Enable SDL"=', restored)
        self.assertNotIn('"KeepDS4BluetoothReportFixup"=', restored)

    def test_refuses_duplicate_values_and_unrelated_backup_sections(self):
        duplicate = BASE.replace('"Unrelated"="keep"', '"DisableHidraw"=dword:00000000')
        with self.assertRaises(ValueError):
            installer.registry_snapshot(duplicate)
        snapshot = installer.registry_snapshot(BASE)
        snapshot["synthetic_sections"] = [NEW_SETTING]
        with self.assertRaises(ValueError):
            installer.restore_registry(BASE, snapshot)

    def make_runtime(self, path, label):
        for relative in installer.REQUIRED_FILES:
            target = path / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(label + relative)
            if relative.startswith("bin/"):
                target.chmod(0o755)
        return installer.inventory(path)

    def test_manifest_rejects_corruption_traversal_and_external_links(self):
        with tempfile.TemporaryDirectory() as temporary:
            runtime = Path(temporary) / "runtime"
            manifest = self.make_runtime(runtime, "candidate")
            installer.verify_runtime(runtime, manifest)
            (runtime / "bin/wine").write_text("changed")
            with self.assertRaises(ValueError):
                installer.verify_runtime(runtime, manifest)
            manifest["files"]["../outside"] = "0" * 64
            with self.assertRaises(ValueError):
                installer.verify_runtime(runtime, manifest)
            (runtime / "outside").symlink_to(Path(temporary))
            with self.assertRaises(ValueError):
                installer.inventory(runtime)

    def test_refuses_shadowing_wine64(self):
        with tempfile.TemporaryDirectory() as temporary:
            runtime = Path(temporary)
            self.make_runtime(runtime, "candidate")
            (runtime / "bin/wine64").write_text("old loader")
            with self.assertRaises(ValueError):
                installer.verify_runtime(runtime, installer.inventory(runtime))

    def transaction(self, fail):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            data, package = root / "data", root / "package"
            old = self.make_runtime(data / "wine", "old")
            manifest = self.make_runtime(package / "runtime", "candidate")
            (package / "runtime-manifest.json").write_text(json.dumps(manifest))
            prefix = data / "wineprefix"
            prefix.mkdir()
            registry = prefix / "system.reg"
            registry.write_text(BASE)
            calls = []

            def wineboot(target, log):
                calls.append(target)
                driver = target / "wineprefix/drive_c/windows/system32/drivers/winebus.sys"
                driver.parent.mkdir(parents=True, exist_ok=True)
                driver.write_bytes((target / "wine/lib/wine/x86_64-windows/winebus.sys").read_bytes())
                if len(calls) == 1:
                    registry.write_text(registry.read_text() + NEW_SETTING)
                    if fail:
                        raise RuntimeError("injected wineboot failure")

            with patch.object(installer, "ensure_idle"), patch.object(installer, "stop_prefix"), \
                    patch.object(installer, "update_prefix", side_effect=wineboot):
                if fail:
                    with self.assertRaisesRegex(RuntimeError, "injected"):
                        installer.install(data, package)
                else:
                    backup = installer.install(data, package)
                    self.assertEqual(installer.inspect_registry(registry.read_text())["winebus"],
                                     installer.SETTINGS)
                    with self.assertRaisesRegex(RuntimeError, "already has a backup"):
                        installer.install(data, package)
                    installer.rollback(data, backup)
            self.assertEqual(installer.inventory(data / "wine"), old)
            self.assertEqual(installer.registry_snapshot(registry.read_text()),
                             installer.registry_snapshot(BASE))
            self.assertIn(NEW_SETTING, registry.read_text())
            self.assertEqual(json.loads((data / installer.RECEIPT).read_text())["status"], "rolled_back")

    def test_success_then_targeted_rollback(self):
        self.transaction(False)

    def test_failed_install_automatically_rolls_back(self):
        self.transaction(True)

    def test_launcher_and_game_must_be_closed_for_selected_prefix(self):
        with tempfile.TemporaryDirectory() as temporary:
            data = Path(temporary) / "Yaagl OS"
            with patch("subprocess.check_output", return_value=f"123 /app/Yaagl --path={data}"):
                with self.assertRaisesRegex(RuntimeError, "Close YAAGL"):
                    installer.ensure_idle(data)
            with patch("subprocess.check_output", return_value=r"123 C:\game\GenshinImpact.exe"), \
                    patch("subprocess.run") as run:
                run.return_value.stdout = f"process WINEPREFIX={data / 'wineprefix'} PATH=/usr/bin"
                with self.assertRaisesRegex(RuntimeError, "Close Windows"):
                    installer.ensure_idle(data)
                run.return_value.stdout = "process WINEPREFIX=/somewhere/else PATH=/usr/bin"
                installer.ensure_idle(data)


if __name__ == "__main__":
    unittest.main()
