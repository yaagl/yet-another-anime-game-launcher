import { batch, createSignal } from "solid-js";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  ChannelClient,
  ChannelClientInstallState,
} from "../../../channel-client";
import { Server } from "@constants";
import { Locale } from "@locale";
import {
  assertValueDefined,
  exec,
  getFreeSpace,
  getKey,
  getKeyOrDefault,
  log,
  rawString,
  setKey,
  spawn,
  stats,
  timeout,
  waitImageReady,
} from "@utils";
import { join } from "path-browserify";
import { coerce, gt, lt, SemVer, valid } from "semver";
import { Config } from "@config";
import { checkIntegrityProgram } from "./program-check-integrity";
import {
  predownloadGameProgram,
  updateGameProgram,
} from "./program-update-game";
import {
  downloadAndInstallGameProgram,
  INSTALL_STATE_MARKER,
} from "./program-install-game";
import { launchGameProgram } from "./program-launch-game";
import { patchRevertProgram } from "../patch";
import { Aria2 } from "@aria2";
import { Sophon, createSophonRetry } from "@sophon";
import { Wine } from "@wine";
import {
  checkAndDownloadDXMT,
  checkAndDownloadDXVK,
  checkAndDownloadReshade,
} from "../../../downloadable-resource";
import { createWorkaround3Config } from "./config/workaround-3";
import createPatchOff from "./config/patch-off";
import createSteamPatch from "./config/steam-patch";
import createBlockNet from "./config/block-net";
import createResolution from "./config/resolution";
import createTimeoutFix from "./config/timeout-fix";
import { createEnableHDRConfig } from "./config/enable-hdr";
import { getGameVersion } from "../unity";
import {
  VoicePackNames,
  HoyoConnectGameBackgroundType,
} from "../launcher-info";
import { getLatestAdvInfo, getLatestVersionInfo } from "../hyp-connect";

// no need to check supported version
// const CURRENT_SUPPORTED_VERSION = "4.8.0";

export async function createHK4EChannelClient({
  server,
  locale,
  aria2,
  wine,
  releaseType,
}: {
  server: Server;
  locale: Locale;
  aria2: Aria2;
  wine: Wine;
  releaseType: "os" | "cn" | "bb";
}): Promise<ChannelClient> {
  const {
    background: { url: background },
    icon: { url: icon, link: icon_link },
    video: { url: video_url },
    theme: { url: theme_url },
    type: bg_type,
  } = await getLatestAdvInfo(locale, server);
  const IS_VIDEO_BG =
    bg_type === HoyoConnectGameBackgroundType.BACKGROUND_TYPE_VIDEO;
  await waitImageReady(background);

  const sophon_port = Math.floor(Math.random() * (65535 - 40000)) + 40000;
  const sophon_host = "127.0.0.1";

  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  const { pid: spid } = await spawn(["./sidecar/sophon_server/sophon-server"], {
    TERMINATE_WITH_PID: pid,
    SOPHON_PORT: sophon_port.toString(),
    SOPHON_HOST: sophon_host,
  });
  const sophon = await Promise.race([
    createSophonRetry(sophon_host, sophon_port),
    timeout(30000),
  ]).catch(() => Promise.reject(new Error("Fail to launch sophon.")));

  const gameInfo = await sophon.getLatestOnlineGameInfo(releaseType, "hk4e");
  log(`Game info: ${JSON.stringify(gameInfo)}`);
  const LATEST_GAME_VERSION: string = gameInfo.version;
  const UPDATABLE_VERSIONS: string[] = gameInfo.updatable_versions;
  const PRE_DOWNLOAD_VERSION: string = gameInfo.pre_download_version || "0.0.0";
  const PRE_DOWNLOAD_AVAILABLE: boolean = gameInfo.pre_download;
  const INSTALL_SIZE_BYTES: number = gameInfo.install_size;

  const { gameInstalled, gameInstallDir, gameVersion } = await checkGameState(
    locale,
    server,
    releaseType
  );

  const [installed, setInstalled] = createSignal<ChannelClientInstallState>(
    gameInstalled
      ? "INSTALLED"
      : gameInstallDir
      ? "PARTIAL_INSTALL"
      : "NOT_INSTALLED"
  );
  const [showPredownloadPrompt, setShowPredownloadPrompt] =
    createSignal<boolean>(
      gameInstalled &&
        PRE_DOWNLOAD_AVAILABLE &&
        (await getKeyOrDefault("predownloaded_all", "NOTFOUND")) ==
          "NOTFOUND" && // not downloaded yet
        isVersionGreater(PRE_DOWNLOAD_VERSION, gameVersion) // predownload version is greater
    );
  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? ""
  );
  const [gameCurrentVersion, setGameVersion] = createSignal(
    gameVersion ?? "0.0.0"
  );
  const updateRequired = () =>
    installed() == "INSTALLED" &&
    isVersionLower(gameCurrentVersion(), LATEST_GAME_VERSION);
  return {
    installState: installed,
    showPredownloadPrompt,
    installDir: _gameInstallDir,
    updateRequired,
    uiContent: {
      background: background, // Always show image
      background_video: IS_VIDEO_BG ? video_url : undefined,
      background_theme: IS_VIDEO_BG ? theme_url : undefined,
      iconImage: icon,
      url: icon_link,
    },
    predownloadVersion: () =>
      PRE_DOWNLOAD_AVAILABLE ? PRE_DOWNLOAD_VERSION : "",
    dismissPredownload() {
      setShowPredownloadPrompt(false);
    },
    async *install(selection: string): CommonUpdateProgram {
      await setKey("game_install_dir", selection);
      const existingGameDir = await findExistingGameInstallDir(
        selection,
        releaseType,
        server
      );
      if (!existingGameDir) {
        const freeSpaceGB = await getFreeSpace(selection, "g");
        const requiredSpaceGB =
          Math.ceil(INSTALL_SIZE_BYTES / Math.pow(1024, 3)) * 1.2;
        if (freeSpaceGB < requiredSpaceGB) {
          await locale.alert(
            "NO_ENOUGH_DISKSPACE",
            "NO_ENOUGH_DISKSPACE_DESC",
            [requiredSpaceGB + "", (requiredSpaceGB * 1.074).toFixed(1)]
          );
          return;
        }

        yield* downloadAndInstallGameProgram({
          sophonClient: sophon,
          gameDir: selection,
          installReltype: releaseType,
        });
        // setGameInstalled
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(selection);
          setGameVersion(LATEST_GAME_VERSION);
        });
        await setKey("game_install_dir", selection);
        return;
      }
      const gameVersion = await getGameVersionGI(
        join(existingGameDir, server.dataDir)
      );
      // if (gt(gameVersion, CURRENT_SUPPORTED_VERSION)) {
      //   await locale.alert(
      //     "UNSUPPORTED_VERSION",
      //     "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
      //     [gameVersion]
      //   );
      //   return;
      // } else
      if (lt(gameVersion, LATEST_GAME_VERSION)) {
        const updatable = UPDATABLE_VERSIONS.includes(gameVersion);
        if (!updatable) {
          await locale.prompt(
            "UNSUPPORTED_VERSION",
            "GAME_VERSION_TOO_OLD_DESC",
            [gameVersion]
          );
          return;
        }
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(existingGameDir);
          setGameVersion(gameVersion);
        });
        await setKey("game_install_dir", existingGameDir);
        // FIXME: perform a integrity check?
      } else {
        yield* checkIntegrityProgram({
          sophon,
          gameDir: existingGameDir,
        });
        // setGameInstalled
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(existingGameDir);
          setGameVersion(gameVersion);
        });
        await setKey("game_install_dir", existingGameDir);
      }
    },
    async *predownload() {
      setShowPredownloadPrompt(false);
      if (!PRE_DOWNLOAD_AVAILABLE) return;
      yield* predownloadGameProgram({
        sophon,
        gameDir: _gameInstallDir(),
      });
    },
    async *update() {
      const updatable = UPDATABLE_VERSIONS.includes(gameCurrentVersion());
      if (!updatable) {
        await locale.prompt(
          "UNSUPPORTED_VERSION",
          "GAME_VERSION_TOO_OLD_DESC",
          [gameCurrentVersion()]
        );
        batch(() => {
          setInstalled("NOT_INSTALLED");
          setGameInstallDir("");
          setGameVersion("0.0.0");
        });
        await setKey("game_install_dir", null);
        return;
      }
      yield* updateGameProgram({
        sophon,
        gameDir: _gameInstallDir(),
        server,
        updatedGameVersion: LATEST_GAME_VERSION,
      });
      batch(() => {
        setGameVersion(LATEST_GAME_VERSION);
      });
    },
    async *launch(config: Config) {
      // if (
      //   gt(gameCurrentVersion(), CURRENT_SUPPORTED_VERSION) &&
      //   !config.patchOff
      // ) {
      //   await locale.alert(
      //     "UNSUPPORTED_VERSION",
      //     "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
      //     [gameCurrentVersion()]
      //   );
      //   return;
      // }
      if (config.reshade) {
        yield* checkAndDownloadReshade(aria2, wine, _gameInstallDir());
      }
      if (wine.attributes.renderBackend == "dxmt") {
        yield* checkAndDownloadDXMT(aria2);
      }
      yield* launchGameProgram({
        gameDir: _gameInstallDir(),
        wine,
        gameExecutable: server.executable,
        config,
        server,
      });
    },
    async *checkIntegrity() {
      yield* checkIntegrityProgram({
        sophon,
        gameDir: _gameInstallDir(),
      });
    },
    async *init(config: Config) {
      try {
        await getKey("patched");
      } catch {
        return;
      }
      try {
        yield* patchRevertProgram(_gameInstallDir(), wine, server, config);
      } catch {
        yield* checkIntegrityProgram({
          sophon,
          gameDir: _gameInstallDir(),
        });
      }
    },
    async createConfig(locale: Locale, config: Partial<Config>) {
      const [W3] = await createWorkaround3Config({ locale, config });
      const [PO] = await createPatchOff({ locale, config });
      const [SP] = await createSteamPatch({ locale, config });
      const [BN] = await createBlockNet({ locale, config });
      const [HDR] = await createEnableHDRConfig({ locale, config });
      const [RES] = await createResolution({ locale, config });
      const [TF] = await createTimeoutFix({ locale, config });

      return function () {
        return [
          "Game Version: ",
          gameCurrentVersion(),
          <HDR />,
          <W3 />,
          <PO />,
          <SP />,
          <BN />,
          <RES />,
          <TF />,
        ];
      };
    },
  };
}

async function getGameVersionGI(gameDataDir: string) {
  for (const offset of [0xac, undefined] as const) {
    try {
      const ret =
        offset == null
          ? await getGameVersion(gameDataDir)
          : await getGameVersion(gameDataDir, offset);
      const gameVersion = normalizeVersion(ret);
      if (gameVersion == null) throw new Error("Failed to parse game version");
      await log(String(new SemVer(gameVersion)));
      return gameVersion;
    } catch {
      // Try the next known metadata layout.
    }
  }
  throw new Error("Failed to parse game version");
}

function normalizeVersion(version: unknown) {
  if (typeof version != "string" || version.trim() == "") return;
  return valid(version) ?? coerce(version)?.version;
}

function isVersionGreater(a: unknown, b: unknown) {
  const av = normalizeVersion(a);
  const bv = normalizeVersion(b);
  return av != null && bv != null && gt(av, bv);
}

function isVersionLower(a: unknown, b: unknown) {
  const av = normalizeVersion(a);
  const bv = normalizeVersion(b);
  return av != null && bv != null && lt(av, bv);
}

async function hasExistingGameInstall(
  gameDir: string,
  releaseType: "os" | "cn" | "bb",
  server: Server
) {
  try {
    await stats(join(gameDir, "config.ini"));
    try {
      await stats(join(gameDir, INSTALL_STATE_MARKER));
      return false;
    } catch {
      // Missing install marker means the launcher did not leave an install in progress.
    }
    if (await hasLegacySophonResumeState(gameDir)) return false;
    await stats(
      join(gameDir, releaseType == "os" ? "GenshinImpact.exe" : "YuanShen.exe")
    );
    await stats(join(gameDir, server.dataDir, "globalgamemanagers"));
    await getGameVersionGI(join(gameDir, server.dataDir));
    return true;
  } catch {
    return false;
  }
}

async function hasLegacySophonResumeState(gameDir: string) {
  try {
    const entries = await Neutralino.filesystem.readDirectory(
      join(gameDir, ".tmp")
    );
    return entries.some(entry => {
      if (entry.type != "FILE") return false;
      return !entry.entry.endsWith(".json") && !entry.entry.endsWith(".zstd");
    });
  } catch {
    return false;
  }
}

async function findExistingGameInstallDir(
  selection: string,
  releaseType: "os" | "cn" | "bb",
  server: Server
) {
  if (await hasExistingGameInstall(selection, releaseType, server)) {
    return selection;
  }

  try {
    const entries = await Neutralino.filesystem.readDirectory(selection);
    for (const entry of entries) {
      if (entry.type != "DIRECTORY") continue;
      const candidate = join(selection, entry.entry);
      if (await hasExistingGameInstall(candidate, releaseType, server)) {
        return candidate;
      }
    }
  } catch {
    // Ignore unreadable folders. The normal install path will handle them.
  }
}

async function hasInstallResumeState(gameDir: string) {
  try {
    await stats(join(gameDir, INSTALL_STATE_MARKER));
    return true;
  } catch {
    // Fall back to legacy markers below.
  }
  try {
    await stats(join(gameDir, "config.ini"));
    return true;
  } catch {
    try {
      await stats(join(gameDir, ".tmp"));
      return true;
    } catch {
      return false;
    }
  }
}

async function checkGameState(
  locale: Locale,
  server: Server,
  releaseType: "os" | "cn" | "bb"
) {
  let gameDir = "";
  try {
    gameDir = await getKey("game_install_dir");
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
  try {
    if (!(await hasExistingGameInstall(gameDir, releaseType, server))) {
      throw new Error("Incomplete game installation");
    }
    return {
      gameInstalled: true,
      gameInstallDir: gameDir,
      gameVersion: await getGameVersionGI(join(gameDir, server.dataDir)),
    } as const;
  } catch {
    if (gameDir && (await hasInstallResumeState(gameDir))) {
      return {
        gameInstalled: false,
        gameInstallDir: gameDir,
      } as const;
    }
    return {
      gameInstalled: false,
    } as const;
  }
}
