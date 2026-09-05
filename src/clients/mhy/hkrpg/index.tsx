import { batch, createSignal } from "solid-js";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  ChannelClient,
  ChannelClientInstallState,
} from "../../../channel-client";
import { Server } from "@constants";
import { Locale } from "@locale";
import {
  exec,
  getFreeSpace,
  getKey,
  getKeyOrDefault,
  log,
  rawString,
  readAllLinesIfExists,
  setKey,
  spawn,
  stats,
  timeout,
  waitImageReady,
} from "@utils";
import { join } from "path-browserify";
import { gt, lt } from "semver";
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
  checkAndDownloadJadeite,
  checkAndDownloadReshade,
} from "../../../downloadable-resource";
import { getGameVersion2019 } from "../unity";
import { HoyoConnectGameBackgroundType } from "../launcher-info";
import createPatchOff from "./config/patch-off";
import createBlockNet from "./config/block-net";
import { getLatestAdvInfo } from "../hyp-connect";

export async function createHKRPGChannelClient({
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
  releaseType: "os" | "cn";
}): Promise<ChannelClient> {
  const {
    background: { url: background },
    icon: { link: icon_link },
    video: { url: video_url },
    theme: { url: theme_url },
    type: bg_type,
  } = await getLatestAdvInfo(locale, server);
  const IS_VIDEO_BG =
    bg_type === HoyoConnectGameBackgroundType.BACKGROUND_TYPE_VIDEO;

  const sophon_port = Math.floor(Math.random() * (65535 - 40000)) + 40000;
  const sophon_host = "127.0.0.1";

  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  await spawn(["./sidecar/sophon_server/sophon-server"], {
    TERMINATE_WITH_PID: pid,
    SOPHON_PORT: sophon_port.toString(),
    SOPHON_HOST: sophon_host,
  });
  const sophon = await Promise.race([
    createSophonRetry(sophon_host, sophon_port),
    timeout(30000),
  ]).catch(() => Promise.reject(new Error("Fail to launch sophon.")));

  const gameInfo = await sophon.getLatestOnlineGameInfo(releaseType, "hkrpg");
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
        await stats(join(selection, "GameAssembly.dll")); // FIXME: no pkg_version?
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
      const gameVersion = await getInstalledVersion(selection, server);
      if (lt(gameVersion, LATEST_GAME_VERSION)) {
        if (!UPDATABLE_VERSIONS.includes(gameVersion)) {
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
      if (!UPDATABLE_VERSIONS.includes(gameCurrentVersion())) {
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
      });
      batch(() => {
        setGameVersion(LATEST_GAME_VERSION);
      });
    },
    async *launch(config: Config) {
      if (config.reshade) {
        yield* checkAndDownloadReshade(aria2, wine, _gameInstallDir());
      }
      if (wine.attributes.renderBackend == "dxmt") {
        yield* checkAndDownloadDXMT(aria2);
      }
      yield* checkAndDownloadJadeite(aria2);
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
      const [PO] = await createPatchOff({ locale, config });
      const [BN] = await createBlockNet({ locale, config });

      return function () {
        return ["Game Version: ", gameCurrentVersion(), <PO />, <BN />];
      };
    },
  };
}

/**
 * data.unity3d is rewritten early during an update while config.ini is only
 * rewritten once the whole update succeeds. The game reads config.ini, so an
 * interrupted update leaves the launcher believing it is done while the game
 * refuses to start. Report the lower of the two, the way the sophon server does.
 */
async function getInstalledVersion(gameDir: string, server: Server) {
  const unityVersion = await getGameVersion2019(join(gameDir, server.dataDir));
  const lines = await readAllLinesIfExists(join(gameDir, "config.ini"));
  const configVersion = lines
    .map(line => /^game_version=(\d+\.\d+\.\d+)/.exec(line.trim())?.[1])
    .find(version => version != undefined);
  if (configVersion && lt(configVersion, unityVersion)) {
    log(
      `config.ini reports ${configVersion} while data.unity3d reports ${unityVersion}; the update did not finish`
    );
    return configVersion;
  }
  return unityVersion;
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
      gameVersion: await getInstalledVersion(gameDir, server),
    } as const;
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
}
