import { join } from "path-browserify";
import { CommonUpdateProgram } from "../../../common-update-ui";
import { Server } from "../../../constants";
import {
  alert,
  appendFile,
  env as getEnv,
  fileOrDirExists,
  mkdirp,
  removeFile,
  readFile,
  writeBinary,
  writeFile,
  readBinary,
  readDirectory,
  resolve,
  utf16le,
  log,
  exec,
  getKeyOrDefault,
  summarizeText,
  findBlockedHostsEntries,
} from "../../../utils";
import { DEBUG_WINEDEBUG, Wine } from "../../../wine";
import { Config } from "@config";
import { patchProgram, patchRevertProgram } from "../patch";
import { NAP_CN_BLOCK_URL, NAP_OS_BLOCK_URL } from "../../secret";

interface LaunchDiagnostics {
  debug: boolean;
  id: number;
  metaLog: string;
  fixWebviewLog: string;
  setPropsLog: string;
  patchLog: string;
  blockNetLog: string;
  gameLog: string;
}

export async function* launchGameProgram({
  gameDir,
  gameExecutable,
  wine,
  config,
  server,
}: {
  gameDir: string;
  gameExecutable: string;
  wine: Wine;
  config: Config;
  server: Server;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "PATCHING"];
  await mkdirp(resolve("./logs"));

  const launchId = Date.now();
  const launchMode = config.steamPatch ? "steam-patch" : "config-bat";
  const diagnostics = createLaunchDiagnostics(launchId, launchMode, config);
  const yaaglDir = resolve("./");
  const dxmtConfigFile = join(yaaglDir, "dxmt.conf");
  await recordLaunchDiagnostic(
    diagnostics.metaLog,
    [
      `launchId=${launchId}`,
      `launchMode=${launchMode}`,
      `server=${server.id}`,
      `gameDir=${gameDir}`,
      `gameExecutable=${gameExecutable}`,
      `winePrefix=${wine.prefix}`,
      `renderBackend=${wine.attributes.renderBackend ?? "unknown"}`,
      `wineTag=${await getKeyOrDefault("wine_tag", "unknown")}`,
      `dxmtVersion=${await getKeyOrDefault(
        "installed_dxmt_version",
        "unknown"
      )}`,
      `dxmtConfigFile=${dxmtConfigFile}`,
      `dxmtConfigFileExists=${await fileOrDirExists(dxmtConfigFile)}`,
      `steamPatch=${config.steamPatch}`,
      `timeoutFix=${config.timeoutFix}`,
      `patchOff=${config.patchOff}`,
      `blockNet=${config.blockNet}`,
      `proxyEnabled=${config.proxyEnabled}`,
      `proxyHost=${config.proxyHost}`,
      `proxyNote=proxy is recorded only; this diagnostic path does not treat proxy settings as a primary failure cause`,
      `debugLaunch=${config.debugLaunch}`,
    ].join("\n")
  );

  await wine.prepareForLaunch(
    diagnostics.debug
      ? {
          phase: "nap.prepareWineServer",
          logFile: diagnostics.metaLog,
          teeOutput: true,
          debug: true,
        }
      : undefined
  );
  await fixWebview(wine, server, diagnostics);
  await wine.setProps(config, {
    debug: diagnostics.debug,
    logFile: diagnostics.setPropsLog,
  });

  const args = [];
  if (config.resolutionCustom) {
    args.push("-screen-width", config.resolutionWidth);
    args.push("-screen-height", config.resolutionHeight);
    args.push("-screen-fullscreen", "0");
  }
  const cmd = `@echo off
cd "%~dp0"
copy "${wine.toWinePath(
    join(gameDir, atob("SG9Zb0tQcm90ZWN0LnN5cw=="))
  )}" "%WINDIR%\\system32\\"
cd /d "${wine.toWinePath(gameDir)}"
"${wine.toWinePath(join(gameDir, gameExecutable))}" ${args.join(" ")}`;
  await writeFile(resolve("config.bat"), cmd);
  await recordLaunchDiagnostic(
    diagnostics.metaLog,
    [`configBatPath=${resolve("config.bat")}`, "configBat:", cmd].join("\n")
  );
  await recordLaunchDiagnostic(diagnostics.patchLog, "patchProgram start");
  yield* patchProgram(gameDir, wine, server, config);
  await recordLaunchDiagnostic(diagnostics.patchLog, "patchProgram end");
  let launchErrorSummary: string | undefined;
  let launchStartedAt = new Date();
  try {
    yield ["setStateText", "GAME_RUNNING"];
    launchStartedAt = new Date();

    if (config.blockNet) {
      const tmpScriptPath = "/tmp/yaagl_network_block_script.sh";
      const blockUrl =
        server.id == "nap_global" ? NAP_OS_BLOCK_URL : NAP_CN_BLOCK_URL;

      const commands = [
        `#!/bin/sh`,

        `HOSTS_FILE="/etc/hosts"`,
        `ENTRY="0.0.0.0 ${blockUrl}"`,
        `PAD_START="# Temporarily Added by Yaagl"`,
        `PAD_END="# End of section"`,

        `if ! grep -qF "$ENTRY" "$HOSTS_FILE"; then`,
        `sudo bash -c "echo -e '$PAD_START\n$ENTRY\n$PAD_END' >> '/etc/hosts'"`,
        `fi`,
        `sleep 20`,
        `sudo sed -i.bak "/$PAD_START/,/$PAD_END/d" "$HOSTS_FILE"`,

        `rm ${tmpScriptPath}`,
      ];

      await writeFile(tmpScriptPath, commands.join("\n"));
      await exec(
        [
          "osascript",
          "-e",
          `do shell script "source ${tmpScriptPath} > /dev/null 2>&1 &" with administrator privileges`,
        ],
        {},
        diagnostics.debug
          ? {
              phase: "nap.blockNet",
              logFile: diagnostics.blockNetLog,
              teeOutput: true,
              debug: true,
            }
          : false
      );
    }

    await wine.exec2(
      config.steamPatch ? "C:\\windows\\system32\\steam.exe" : "cmd",
      config.steamPatch
        ? [wine.toWinePath(join(gameDir, gameExecutable))]
        : ["/c", `${wine.toWinePath(resolve("./config.bat"))} `],
      {
        MTL_HUD_ENABLED: config.metalHud ? "1" : "",
        WINEDLLOVERRIDES: "",
        ...(diagnostics.debug ? { WINEDEBUG: DEBUG_WINEDEBUG } : {}),
        WINE_ENABLE_TIMEOUT_FIX: config.timeoutFix ? "1" : "0",
        ...(wine.attributes.renderBackend == "dxmt"
          ? {
              DXMT_LOG_PATH: yaaglDir,
              DXMT_CONFIG_FILE: dxmtConfigFile,
              GST_PLUGIN_FEATURE_RANK: "atdec:MAX,avdec_h264:MAX",
            }
          : {
              WINEESYNC: "1",
            }),
        ...(config.proxyEnabled
          ? {
              HTTP_PROXY: config.proxyHost,
              HTTPS_PROXY: config.proxyHost,
            }
          : {}),
      },
      {
        phase: `nap.launch.${launchMode}`,
        logFile: diagnostics.gameLog,
        debug: diagnostics.debug,
      }
    );
    await wine.waitUntilServerOff();
    if (config.resolutionCustom) {
      await revertResolutionRegistry(wine, server);
    }
  } catch (e: unknown) {
    // A failed Wine launch can leave winedevice attached to the prefix.
    // Stop both msync modes before collecting evidence and reverting patches.
    await wine.prepareForLaunch(
      diagnostics.debug
        ? {
            phase: "nap.launch.cleanup",
            logFile: diagnostics.metaLog,
            teeOutput: true,
            debug: true,
          }
        : undefined
    );
    const crashReports = await collectCrashReports(launchStartedAt);
    const driverErrorLog = join(gameDir, "driverError.log");
    const driverError = await readTextIfExists(driverErrorLog);
    const gameLog = await readTextIfExists(diagnostics.gameLog);
    const blockedHosts = await collectBlockedHosts(server);
    const diagnosticHints = buildDiagnosticHints({
      config,
      blockedHosts,
      driverError,
      gameLog,
    });
    launchErrorSummary = buildLaunchFailureSummary({
      error: e,
      launchMode,
      diagnostics,
      crashReports,
      blockedHosts,
      driverErrorLog,
      driverError,
      diagnosticHints,
    });
    await log(launchErrorSummary);
    await recordLaunchDiagnostic(diagnostics.metaLog, launchErrorSummary);
  }

  // await removeFile(resolve("bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"));
  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine, server, config);
  if (launchErrorSummary) {
    await alert(
      "Game launch failed",
      buildLaunchFailureAlert(launchMode, diagnostics)
    );
  }
}

async function fixWebview(
  wine: Wine,
  server: Server,
  diagnostics: LaunchDiagnostics
) {
  let key = "HKEY_CURRENT_USER\\Software\\\x6d\x69\x48\x6f\x59\x6f\\";
  if (server.id === "nap_cn") {
    key += "\u7edd\u533a\u96f6";
  } else if (server.id === "nap_global") {
    key += "\x5a\x65\x6e\x6c\x65\x73\x73\x5a\x6f\x6e\x65\x5a\x65\x72\x6f";
  } else {
    return;
  }

  const reg = [
    `Windows Registry Editor Version 5.00`,
    ``,
    `[${key}]`,
    `"MIHOYOSDK_WEBVIEW_RENDER_METHOD_h1573598267"=-`,
  ];

  try {
    await wine.exec(
      "reg",
      ["query", key],
      diagnostics.debug ? { WINEDEBUG: DEBUG_WINEDEBUG } : {},
      diagnostics.debug
        ? {
            phase: "nap.fixWebview.reg-query",
            logFile: diagnostics.fixWebviewLog,
            teeOutput: true,
            debug: true,
          }
        : resolve("fix_webview.log")
    );

    // the output contains malformed CJK characters
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const output = decoder.decode(
      await readBinary(
        diagnostics.debug
          ? diagnostics.fixWebviewLog
          : resolve("fix_webview.log")
      )
    );

    for (let line of output.split("\n")) {
      line = line.trim();
      if (line.startsWith("HOYO_WEBVIEW_RENDER_METHOD_ABTEST_")) {
        const abtest = line.split(" ", 2)[0];
        reg.push(`"${abtest}"=-`);
      }
    }
  } catch (e: unknown) {
    await recordLaunchDiagnostic(
      diagnostics.fixWebviewLog,
      `fixWebview skipped after registry query failure:\n${String(e)}`
    );
    return;
  }

  await writeBinary(resolve("fix_webview.reg"), utf16le(reg.join("\r\n")));
  await wine.exec(
    "reg",
    ["import", `${wine.toWinePath(resolve("./fix_webview.reg"))}`],
    diagnostics.debug ? { WINEDEBUG: DEBUG_WINEDEBUG } : {},
    diagnostics.debug
      ? {
          phase: "nap.fixWebview.reg-import",
          logFile: diagnostics.fixWebviewLog,
          teeOutput: true,
          debug: true,
        }
      : "/dev/null"
  );
}

async function revertResolutionRegistry(wine: Wine, server: Server) {
  let key = "HKEY_CURRENT_USER\\Software\\\x6d\x69\x48\x6f\x59\x6f\\";
  if (server.id === "nap_cn") {
    key += "\u7edd\u533a\u96f6";
  } else if (server.id === "nap_global") {
    key += "\x5a\x65\x6e\x6c\x65\x73\x73\x5a\x6f\x6e\x65\x5a\x65\x72\x6f";
  } else {
    return;
  }

  try {
    const reg = [`Windows Registry Editor Version 5.00`, ``, `[${key}]`];
    await wine.exec("reg", ["query", key], {}, resolve("fix_resolution.log"));
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const output = decoder.decode(
      await readBinary(resolve("fix_resolution.log"))
    );

    for (let line of output.split("\r\n")) {
      line = line.trim();
      if (
        line.startsWith("Screenmanager Is Fullscreen mode_") ||
        line.startsWith("Screenmanager Resolution_")
      ) {
        const value = line.split(" ", 2)[0]; // FIXME: spaces in key?
        // It seems that unity didn't use spaces in keys
        reg.push(`"${value}"=-`);
      }
    }

    if (reg.length > 3) {
      await writeBinary(
        resolve("fix_resolution.reg"),
        utf16le(reg.join("\r\n"))
      );
      await wine.exec(
        "reg",
        ["import", `${wine.toWinePath(resolve("./fix_resolution.reg"))}`],
        {},
        "/dev/null"
      );
    }
  } catch {
    return;
  }
}

function createLaunchDiagnostics(
  id: number,
  launchMode: string,
  config: Config
): LaunchDiagnostics {
  const debug = config.debugLaunch;
  const prefix = resolve(`./logs/launch_${id}`);
  return {
    debug,
    id,
    metaLog: `${prefix}_meta.log`,
    fixWebviewLog: `${prefix}_fix-webview.log`,
    setPropsLog: `${prefix}_set-props.log`,
    patchLog: `${prefix}_patch.log`,
    blockNetLog: `${prefix}_block-net.log`,
    gameLog: debug
      ? `${prefix}_game-${launchMode == "steam-patch" ? "steam" : "config"}.log`
      : resolve(`./logs/game_${id}.log`),
  };
}

async function recordLaunchDiagnostic(path: string, message: string) {
  await appendFile(path, `${message}\n\n`);
}

async function readTextIfExists(path: string) {
  try {
    if (!(await fileOrDirExists(path))) return undefined;
    return await readFile(path);
  } catch {
    return undefined;
  }
}

async function collectCrashReports(since: Date) {
  const home = await getEnv("HOME");
  const until = new Date();
  const reportDirs = [
    join(home, "Library/Logs/DiagnosticReports"),
    join(home, "Library/Logs/DiagnosticReports/Retired"),
  ];
  const namePatterns = [
    "wine-preloader",
    "wine",
    "Rosetta",
    "rosetta",
    "Yaagl",
    "yaagl",
  ];
  const reports: string[] = [];
  for (const dir of reportDirs) {
    let entries: Neutralino.filesystem.DirectoryEntry[] = [];
    try {
      entries = await readDirectory(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.type != "FILE") continue;
      if (!isCrashReportInWindow(entry.entry, since, until)) continue;
      if (!namePatterns.some(pattern => entry.entry.includes(pattern))) {
        continue;
      }
      reports.push(join(dir, entry.entry));
    }
  }
  return reports;
}

async function collectBlockedHosts(server: Server) {
  const hosts = await readTextIfExists("/etc/hosts");
  if (!hosts) return [];
  return findBlockedHostsEntries(hosts, getKnownNapBlockDomains(server));
}

function getKnownNapBlockDomains(server: Server) {
  return Array.from(
    new Set([
      server.id == "nap_cn" ? NAP_CN_BLOCK_URL : NAP_OS_BLOCK_URL,
      NAP_CN_BLOCK_URL,
      NAP_OS_BLOCK_URL,
      "globaldp-prod-cn01.juequling.com",
      "globaldp-prod-cn02.juequling.com",
      "globaldp-prod-os01.zenlesszonezero.com",
    ])
  );
}

function isCrashReportInWindow(name: string, since: Date, until: Date) {
  const parsedAt = parseCrashReportTime(name);
  if (!parsedAt) return name.includes(formatCrashReportDay(since));
  const lowerBound = since.getTime() - 60_000;
  const upperBound = until.getTime() + 60_000;
  return parsedAt.getTime() >= lowerBound && parsedAt.getTime() <= upperBound;
}

function parseCrashReportTime(name: string) {
  const match = name.match(/-(\d{4})-(\d{2})-(\d{2})-(\d{6})/);
  if (!match) return undefined;
  const [, year, month, day, time] = match;
  const hour = time.slice(0, 2);
  const minute = time.slice(2, 4);
  const second = time.slice(4, 6);
  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  );
}

function formatCrashReportDay(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLaunchFailureSummary({
  error,
  launchMode,
  diagnostics,
  crashReports,
  blockedHosts,
  driverErrorLog,
  driverError,
  diagnosticHints,
}: {
  error: unknown;
  launchMode: string;
  diagnostics: LaunchDiagnostics;
  crashReports: string[];
  blockedHosts: string[];
  driverErrorLog: string;
  driverError?: string;
  diagnosticHints: string[];
}) {
  const message = error instanceof Error ? error.message : String(error);
  return [
    "Yaagl launch failed after Wine/DXMT launch command returned.",
    `launchId=${diagnostics.id}`,
    `launchMode=${launchMode}`,
    `debugLaunch=${diagnostics.debug}`,
    `gameLog=${diagnostics.gameLog}`,
    `metaLog=${diagnostics.metaLog}`,
    `fixWebviewLog=${diagnostics.fixWebviewLog}`,
    `setPropsLog=${diagnostics.setPropsLog}`,
    `patchLog=${diagnostics.patchLog}`,
    crashReports.length
      ? `matchingCrashReports:\n${crashReports.join("\n")}`
      : "matchingCrashReports=none-found",
    blockedHosts.length
      ? `blockedHosts:\n${blockedHosts.join("\n")}`
      : "blockedHosts=none-found",
    driverError ? `driverErrorLog=${driverErrorLog}` : undefined,
    driverError ? `driverError:\n${summarizeText(driverError)}` : undefined,
    diagnosticHints.length
      ? `diagnosticHints:\n${diagnosticHints.join("\n")}`
      : undefined,
    "error:",
    summarizeText(message),
  ]
    .filter(Boolean)
    .join("\n");
}

function buildDiagnosticHints({
  config,
  blockedHosts,
  driverError,
  gameLog,
}: {
  config: Config;
  blockedHosts: string[];
  driverError?: string;
  gameLog?: string;
}) {
  const hints: string[] = [];
  const combined = `${driverError ?? ""}\n${gameLog ?? ""}`;
  if (blockedHosts.length) {
    hints.push(
      "hosts-block-detected: /etc/hosts blocks a known ZZZ launch domain"
    );
  }
  if (combined.includes("WDFLDR.SYS")) {
    hints.push(
      "wine-runtime-missing-wdfldr: the selected Wine runtime cannot load HoYoKProtect because WDFLDR.SYS is unavailable; this is distinct from a proxy, hosts, or DXMT initialization failure"
    );
  } else if (
    combined.includes("HoYoKProtect.sys") ||
    combined.includes("initDriver Failed")
  ) {
    hints.push(
      "game-driver-load-failure: game log shows HoYoKProtect/WDFLDR driver initialization failure"
    );
  }
  if (config.patchOff) {
    hints.push("patch-off-enabled: Yaagl game patch stage is disabled");
  }
  if (config.proxyEnabled) {
    hints.push(
      "proxy-enabled: proxy settings are recorded but not treated as a primary cause"
    );
  }
  return hints;
}

function buildLaunchFailureAlert(
  launchMode: string,
  diagnostics: LaunchDiagnostics
) {
  return [
    "Yaagl launch failed.",
    `phase=nap.launch.${launchMode}`,
    `launchId=${diagnostics.id}`,
    `gameLog=${diagnostics.gameLog}`,
    `metaLog=${diagnostics.metaLog}`,
  ].join("\n");
}
