# Opt-in external Wine runtime for Genshin

The regular launcher background, launch button, settings and game launch program
are reused. No alternative experimental UI is shipped. Without
`YAAGL_EXTERNAL_RUNTIME_CONFIG`, YAAGL uses its existing Wine installation path.

This adapter lets a separately maintained ARM64 Wine/FEX/DXMT provider own its
prefix and architecture-specific graphics libraries. It does not bundle Wine,
FEX, DXMT, runtime downloads or game files, and it does not convert Windows x64
games to native ARM64 executables. The provider remains responsible for CPU
translation, architecture compatibility, licensing and recovery after the
launcher process disappears. This integration currently wraps the HK4E launch
program; other game clients are rejected when this adapter is configured.

## Configuration

Set `YAAGL_EXTERNAL_RUNTIME_CONFIG` to the absolute path of a trusted local JSON
file in the launcher process environment:

```json
{
  "version": 1,
  "prefix": "/absolute/path/to/separate-prefix",
  "command": ["/absolute/path/to/python3", "/absolute/path/to/provider.py"],
  "distribution": {
    "id": "local-arm64-wine",
    "displayName": "ARM64 Wine / FEX / DXMT",
    "remoteUrl": "",
    "attributes": { "renderBackend": "dxmt" }
  },
  "ownsGraphicsLibraries": true,
  "ownerPidEnvironment": "YAAGL_RUNTIME_OWNER_PID"
}
```

The app wrapper must export the actual native launcher PID in the named variable
before executing the native launcher (`exec`, preserving that PID). Do not use
`open` as the PID owner. Use a separate application/data directory, a separate
prefix, and a separate game copy for validation. The adapter neither migrates
nor copies user installations. No screen resolution, HDR preference, game path
or machine-specific Python path is imposed by the source change. Existing
settings continue to control these values.

The configuration authorizes execution of the specified local command. Do not
load configuration supplied by a website or download one automatically.
Arguments and JSON are escaped by YAAGL's existing command builder.

## Provider protocol

YAAGL appends the following arguments to `command`. Exit status zero means the
operation completed; nonzero propagates the provider's error. Diagnostic output
belongs on stderr when stdout contains JSON.

| Arguments | Provider responsibility |
| --- | --- |
| `download-port` | Ask the OS for an available loopback TCP port (bind port zero), return `{"port":PORT}`. The opt-in launcher uses a per-launch port instead of sharing 6868 with a previous launcher or its exiting downloader. |
| `recover` | Restore an abandoned journal before launcher initialization; refuse an active session owned by another launcher. |
| `prepare OWNER_PID` | Snapshot temporary game files and registry values before any launch mutation; create an atomic journal, start independent owner-liveness monitoring, return `{"id":"opaque-session-id"}`. |
| `exec JSON` | Execute `{program,args,env,logFile}` in the configured prefix, forward stdout/stderr and return the operation's exit code. The provider validates allowed operations and environment. Both synchronous and asynchronous Wine entry points use this blocking-completion protocol. |
| `wait` | Wait for this prefix's Wine server to exit. |
| `request-stop` | Stop only this session/prefix. Safe to call when the owner closes during preparation or execution. |
| `finish SESSION_ID` | Stop remaining processes and restore that journal's exact file/registry state. Serialize with the independent owner monitor and verify restoration. |

YAAGL waits for `prepare` before entering the original game launch generator and
calls `finish` from `finally`, including errors during patching. Window close
requests a stop and waits for the generator and restoration to finish. Closing
during preparation prevents the game from starting. Closing during restoration
does not send another stop that could interrupt registry replay. Force quit
cannot execute JavaScript cleanup; the provider's independent monitor must
recover using the owner PID **and process identity**, accounting for PID reuse.

When `ownsGraphicsLibraries` is true, YAAGL skips downloading/replacing its
bundled x86_64 DXMT/Winemetal files and skips reverting those libraries. The
provider supplies the matching graphics stack. Game-file patch/revert and the
existing Steam helper path remain in the upstream launch program. The Wine
settings tab displays the provider's version instead of offering an unrelated
built-in Wine upgrade. The command-prompt action is disabled for this provider
protocol, which does not expose an interactive terminal.

## Validation and limits

Automated tests cover default opt-out, malformed configuration, argument
escaping, provider failure propagation, failure before the first launch yield,
concurrent launch rejection, close during preparation, and stop/restoration
ordering. Run:

```sh
pnpm exec tsc
pnpm exec vitest run src/wine/runtime-session.spec.ts src/wine/external-runtime.spec.ts
pnpm run build-hk4eos
```

Local integration used an independently prepared Hadron 0.1.1-derived ARM64
runtime with downstream FEX fixes, a separate Wine prefix and an APFS game copy.
Those runtime patches and the isolated test provider are not part of this YAAGL
PR. Their source provenance, reproducible distribution and upstream review are
separate work; this adapter alone is not a replacement runtime installer.

The local launcher was packaged and opened through macOS LaunchServices with
its original UI. Local game validation reaches the login background / protocol
dialog and does not establish in-world playability. macOS 28 has not been tested;
this change makes no guarantee of support for an unreleased OS. Installation,
updates, integrity repair, ReShade and other game clients have not been validated
with the external runtime. The optional native build switches are described in `arm64-build.md`. The
release/updater artifact strategy remains a separate concern: official
self-updates can replace a local ARM64 build.
