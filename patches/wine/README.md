# DS4 v2 Bluetooth support for Genshin

The Wine patches and launcher integration form one feature. The runtime is
packaged inside the Genshin launcher app; it does not depend on an unpublished
download URL. Users select **Wine 11.0 DXMT (DS4 Bluetooth, experimental)** in
the existing Wine version setting. Standard SDL runtimes remain the default.

The launcher checks the bundled archive, stages the complete runtime, saves the
old runtime and controller registry values, and updates the existing prefix.
It enables native HID and `KeepDS4BluetoothReportFixup` only in that prefix.
Selecting the previous Wine version restores the saved runtime and settings.
The game installation and unrelated registry settings are preserved.

## Build and package

Build a complete Wine runtime with these patches, in order:

1. `0001-ds4-targeted-trace.patch`
2. `0002-keep-ds4-bt-report-fixup.patch`

The comparison build used Wine commit
`db11d0fe6a169c457e23d007e20404643d067aa8`, with the stable patches from
[macports-wine](https://github.com/riverfog7/macports-wine/tree/098941d867f8793f559035e298ceb69a8e69f1f3/emulators/wine-stable).
The tested toolchain was Apple clang 21 / SDK 27 and LLVM-MinGW 20261006,
targeting x86_64 macOS 14 with i386 and x86_64 PE modules. SDL, GStreamer,
FFmpeg, GnuTLS and FreeType were enabled. All Wine modules came from that
build; only third-party libraries and Mono came from the existing distribution.

Use the runtime distributor's build process and signing procedure. Do not
replace individual modules in a runtime from an unverified source or ABI.
Include Wine's license and corresponding source information when distributing.

After compiling, package the **runtime directory**, not a user prefix:

```sh
python3 scripts/package_ds4_runtime.py /path/to/complete/wine /path/to/ds4-package
YAAGL_DS4_RUNTIME=/path/to/ds4-package YAAGL_CHANNEL_CLIENT=hk4eos node build-app.js
```

The same package can be supplied to `hk4ecn` and `hk4euniversal` builds. The
normal app tarball and DMG release steps include the bundled archive.
`YAAGL_DS4_RUNTIME` is a build input, not an end-user environment variable.
The runtime option appears only in Genshin builds with the bundle, or in an
installation already using this runtime. Builds without the package retain
the existing runtime choices. Release maintainers must compile and supply
the patched runtime to include this feature; committing patch files alone
does not produce a runtime binary.

## Behavior and evidence

The default-off DWORD preserves Wine's existing `0x11` to `0x01` report
normalization only for native Bluetooth Sony `054c:09cc` devices. Feature and
output I/O results, descriptors and device identity are unchanged. Other
controllers and USB retain their existing fixup policy.

Targeted diagnostic tracing is compiled in but remains off unless the
`ds4` / `ds4parse` Wine debug channels are enabled. Empty reports are rejected
before their first byte is read.

Previously completed checks covered 41,696 source-level policy/report cases
under ASan/UBSan and replay of 4,963 reports. Native control traces showed
that successful feature I/O disabled normalization while Genshin continued
using the generic HID parser. The user reported working gameplay after
enabling the candidate option.

Replay is not gameplay validation. The full control/release matrix, repeated
reconnects and restarts, macOS remapping, gyro and rumble remain unverified.
The native mode disables SDL for this Genshin prefix, so users needing other
controller mappings should retain or restore their previous runtime.
New runtime versions require validation again.

## Source checks

```sh
pnpm exec vitest run src/wine/ds4-registry.spec.ts src/wine/ds4.spec.ts
python3 -m unittest discover -s scripts/diagnostics -p 'test_*.py'
python3 scripts/diagnostics/test_wine_ds4_fixup.py /path/to/patched/wine
```

The launcher installer uses the macOS tools already available to YAAGL and
does not require an end-user Python installation. The standalone Python
installer and diagnostic probes are developer/local troubleshooting tools.
