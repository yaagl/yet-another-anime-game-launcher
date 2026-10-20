import unittest

from ds4_registry import inspect_registry, native_trial_registry, SYNTHETIC_DS4_SUBTREES


def section(key, body=""):
    return "[" + key.replace("\\", "\\\\") + "] 123\n" + body + "\n"


class RegistryTests(unittest.TestCase):
    def test_saved_native_and_xinput_records_do_not_leak_address(self):
        text = section(
            r"System\ControlSet001\Services\winebus",
            '"DisableHidraw"=dword:00000001\n"Enable SDL"=dword:00000001',
        )
        for bus, suffix in [("BTHENUM", ""), ("HID", ""), ("WINEXINPUT", "&IG_00")]:
            text += section(
                rf"System\ControlSet001\Enum\{bus}\VID_054C&PID_09CC{suffix}\private-address"
            )
        # Unrelated settings, devices, and nested properties must not affect the result.
        text += section(r"Other\winebus", '"DisableHidraw"=dword:00000000')
        text += section(r"System\ControlSet001\Enum\HID\VID_045E&PID_028E\other")
        text += section(
            r"System\ControlSet001\Enum\HID\VID_054C&PID_09CC\private-address\Device Parameters"
        )
        result = inspect_registry(text)
        self.assertEqual(result["winebus"], {
            "DisableHidraw": 1, "Enable SDL": 1, "KeepDS4BluetoothReportFixup": 0
        })
        self.assertTrue(result["native_and_xinput_records"])
        self.assertEqual(len(result["sony_device_records"]), 3)
        self.assertNotIn("private-address", str(result))
        self.assertNotIn("045E", str(result))

    def test_native_only_and_wine_defaults(self):
        result = inspect_registry(section(
            r"System\ControlSet001\Enum\HID\VID_054C&PID_09CC\instance"
        ))
        self.assertEqual(result["winebus"], {
            "DisableHidraw": 0, "Enable SDL": 1, "KeepDS4BluetoothReportFixup": 0
        })
        self.assertFalse(result["native_and_xinput_records"])

    def test_explicit_disabled_sdl(self):
        result = inspect_registry(section(
            r"system\controlset001\services\winebus", '"enable sdl"=dword:00000000'
        ))
        self.assertEqual(result["winebus"]["Enable SDL"], 0)

    def test_invalid_type_is_not_reported_as_default(self):
        for name in ("DisableHidraw", "Enable SDL", "KeepDS4BluetoothReportFixup"):
            with self.subTest(name=name), self.assertRaises(ValueError):
                inspect_registry(section(
                    r"System\ControlSet001\Services\winebus", f'"{name}"="1"'
                ))

    def test_internal_fixup_option_is_audited_and_preserved(self):
        for value in (0, 1, 2):
            text = section(
                r"System\ControlSet001\Services\winebus",
                f'"KeepDS4BluetoothReportFixup"=dword:{value:08x}',
            )
            self.assertEqual(inspect_registry(text)["winebus"]["KeepDS4BluetoothReportFixup"], value)
            self.assertEqual(
                inspect_registry(native_trial_registry(text))["winebus"]["KeepDS4BluetoothReportFixup"],
                value,
            )

    def test_trials_only_change_settings_and_the_five_exact_subtrees(self):
        service = section(
            r"System\ControlSet001\Services\winebus",
            '"disablehidraw"=dword:00000001\n"Unrelated"="keep"',
        )
        preserved = "".join(section(r"System\ControlSet001\Enum" + "\\" + key)
                            for key in (
                                r"HID\VID_054C&PID_09CC\native",
                                r"BTHENUM\VID_054C&PID_09CC\native",
                                r"HID\VID_045E&PID_028E\other",
                                r"HID\VID_054C&PID_09CC&IG_001\similar",
                            ))
        removed = "".join(section(r"System\ControlSet001\Enum" + "\\" + key + suffix)
                          for key in SYNTHETIC_DS4_SUBTREES
                          for suffix in ("", r"\instance", r"\instance\Device Parameters"))
        original = "WINE REGISTRY Version 2\n\n" + service + preserved + removed
        b = native_trial_registry(original)
        c = native_trial_registry(original, clear_synthetic=True)
        self.assertIn(preserved + removed, b)
        self.assertIn(preserved, c)
        for key in SYNTHETIC_DS4_SUBTREES:
            self.assertNotIn(section(r"System\ControlSet001\Enum" + "\\" + key), c)
        self.assertEqual(inspect_registry(c)["winebus"], {
            "DisableHidraw": 0, "Enable SDL": 0, "KeepDS4BluetoothReportFixup": 0
        })
        self.assertIn('"Unrelated"="keep"', c)
        self.assertTrue(c.startswith("WINE REGISTRY Version 2\n\n"))
        self.assertEqual(c, native_trial_registry(c, clear_synthetic=True))
        self.assertTrue(inspect_registry(b)["native_and_xinput_records"])
        self.assertFalse(inspect_registry(c)["native_and_xinput_records"])

    def test_trial_refuses_missing_duplicate_or_malformed_service(self):
        service = section(r"System\ControlSet001\Services\winebus")
        for text in ("", service * 2, service + '"DisableHidraw"="1"\n'):
            with self.subTest(text=text), self.assertRaises(ValueError):
                native_trial_registry(text)


if __name__ == "__main__":
    unittest.main()
