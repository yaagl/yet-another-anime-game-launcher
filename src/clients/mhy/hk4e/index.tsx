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
import { gt, lt, SemVer } from "semver";
import { Config } from "@config";
import { checkIntegrityProgram } from "./program-check-integrity";
import {
  predownloadGameProgram,
  updateGameProgram,
} from "./program-update-game";
import { downloadAndInstallGameProgram } from "./program-install-game";
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

  await waitImageReady(background);

  const { gameInstalled, gameInstallDir, gameVersion } = await checkGameState(
    locale,
    server
  );

  const [installed, setInstalled] = createSignal<ChannelClientInstallState>(
    gameInstalled ? "INSTALLED" : "NOT_INSTALLED"
  );
  const [showPredownloadPrompt, setShowPredownloadPrompt] =
    createSignal<boolean>(
      PRE_DOWNLOAD_AVAILABLE &&
        (await getKeyOrDefault("predownloaded_all", "NOTFOUND")) ==
          "NOTFOUND" && // not downloaded yet
        gameInstalled && // game installed
        gt(PRE_DOWNLOAD_VERSION, gameVersion) // predownload version is greater
    );
  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? ""
  );
  const [gameCurrentVersion, setGameVersion] = createSignal(
    gameVersion ?? "0.0.0"
  );
  const updateRequired = () => lt(gameCurrentVersion(), LATEST_GAME_VERSION);
  return {
    installState: installed,
    showPredownloadPrompt,
    installDir: _gameInstallDir,
    updateRequired,
    uiContent: {
      background: background, // Always show image
      background_video: IS_VIDEO_BG ? video_url : undefined,
      background_theme: IS_VIDEO_BG ? theme_url : undefined,
      url: icon_link,
    },
    predownloadVersion: () =>
      PRE_DOWNLOAD_AVAILABLE ? PRE_DOWNLOAD_VERSION : "",
    dismissPredownload() {
      setShowPredownloadPrompt(false);
    },
    async *install(selection: string): CommonUpdateProgram {
      try {
        await stats(join(selection, "pkg_version"));
      } catch {
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
        join(selection, server.dataDir)
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
          setGameInstallDir(selection);
          setGameVersion(gameVersion);
        });
        await setKey("game_install_dir", selection);
        // FIXME: perform a integrity check?
      } else {
        yield* checkIntegrityProgram({
          sophon,
          gameDir: selection,
        });
        // setGameInstalled
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(selection);
          setGameVersion(gameVersion);
        });
        await setKey("game_install_dir", selection);
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
      if (wine.attributes.renderBackend == "dxvk") {
        yield* checkAndDownloadDXVK(aria2);
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

      return function () {
        return [
          "Game Version: ",
          gameCurrentVersion(),
          <HDR />,
          <W3 />,
          <PO />,
          <SP />,
          <BN />,
        ];
      };
    },
  };
}

async function getGameVersionGI(gameDataDir: string) {
  try {
    const ret = await getGameVersion(gameDataDir, 0xac);
    await log(String(new SemVer(ret)));
    return ret;
  } catch {
    return await getGameVersion(gameDataDir);
  }
}

async function checkGameState(locale: Locale, server: Server) {
  let gameDir = "";
  try {
    gameDir = await getKey("game_install_dir");
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
  try {
    return {
      gameInstalled: true,
      gameInstallDir: gameDir,
      gameVersion: await getGameVersionGI(join(gameDir, server.dataDir)),
    } as const;
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
}
