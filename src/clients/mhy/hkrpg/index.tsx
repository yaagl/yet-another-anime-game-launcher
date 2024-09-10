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
  setKey,
  stats,
  waitImageReady,
} from "@utils";
import { join } from "path-browserify";
import { gt, lt } from "semver";
import { Config } from "@config";
import { checkIntegrityProgram } from "../program-check-integrity";
import {
  predownloadGameProgram,
  updateGameProgram,
} from "./program-update-game";
import { downloadAndInstallGameProgram } from "./program-install-game";
import { launchGameProgram } from "./program-launch-game";
import { patchRevertProgram } from "../patch";
import { Aria2 } from "@aria2";
import { Wine } from "@wine";
import {
  checkAndDownloadDXMT,
  checkAndDownloadDXVK,
  checkAndDownloadJadeite,
  checkAndDownloadReshade,
} from "../../../downloadable-resource";
import { getGameVersion2019 } from "../unity";
import { VoicePackNames } from "../launcher-info";
import createPatchOff from "./config/patch-off";
import { getLatestAdvInfo, getLatestVersionInfo } from "../hyp-connect";

const CURRENT_SUPPORTED_VERSION = "2.5.0";

export async function createHKRPGChannelClient({
  server,
  locale,
  aria2,
  wine,
}: {
  server: Server;
  locale: Locale;
  aria2: Aria2;
  wine: Wine;
}): Promise<ChannelClient> {
  const {
    background: { url: background },
    icon: { url: icon, link: icon_link },
  } = await getLatestAdvInfo(locale, server);
  const {
    main: {
      major: {
        version: GAME_LATEST_VERSION,
        game_pkgs,
        res_list_url: decompressed_path,
      },
      patches,
    },
    pre_download,
  } = await getLatestVersionInfo(server);
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
      pre_download.major != null && //exist pre_download_game data in server response
        (await getKeyOrDefault("predownloaded_all", "NOTFOUND")) ==
          "NOTFOUND" && // not downloaded yet
        gameInstalled && // game installed
        gt(pre_download.major.version, gameVersion) // predownload version is greater
    );
  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? ""
  );
  const [gameCurrentVersion, setGameVersion] = createSignal(
    gameVersion ?? "0.0.0"
  );
  const updateRequired = () => lt(gameCurrentVersion(), GAME_LATEST_VERSION);
  return {
    installState: installed,
    showPredownloadPrompt,
    installDir: _gameInstallDir,
    updateRequired,
    uiContent: {
      background,
      iconImage: icon,
      url: icon_link,
    },
    predownloadVersion: () => pre_download?.major?.version ?? "",
    dismissPredownload() {
      setShowPredownloadPrompt(false);
    },
    async *install(selection: string): CommonUpdateProgram {
      try {
        // await stats(join(selection, "pkg_version"));
        await stats(join(selection, "GameAssembly.dll")); // FIXME: no pkg_version?
      } catch {
        const freeSpaceGB = await getFreeSpace(selection, "g");
        const totalSize = game_pkgs
          .map(x => x.size)
          .map(parseInt)
          .reduce((a, b) => a + b, 0);
        const requiredSpaceGB = Math.ceil(totalSize / Math.pow(1024, 3)) * 1.2;
        if (freeSpaceGB < requiredSpaceGB) {
          await locale.alert(
            "NO_ENOUGH_DISKSPACE",
            "NO_ENOUGH_DISKSPACE_DESC",
            [requiredSpaceGB + "", (requiredSpaceGB * 1.074).toFixed(1)]
          );
          return;
        }

        yield* downloadAndInstallGameProgram({
          aria2,
          gameDir: selection,
          gameSegmentZips: game_pkgs.map(x => x.url),
          gameVersion: GAME_LATEST_VERSION,
          server,
        });
        // setGameInstalled
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(selection);
          setGameVersion(GAME_LATEST_VERSION);
        });
        await setKey("game_install_dir", selection);
        return;
      }
      const gameVersion = await getGameVersion2019(
        join(selection, server.dataDir)
      );
      if (gt(gameVersion, CURRENT_SUPPORTED_VERSION)) {
        await locale.alert(
          "UNSUPPORTED_VERSION",
          "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
          [gameVersion]
        );
        return;
      } else if (lt(gameVersion, GAME_LATEST_VERSION)) {
        const updateTarget = patches.find(x => x.version == gameVersion);
        if (!updateTarget) {
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
        // yield* checkIntegrityProgram({
        //   aria2,
        //   gameDir: selection,
        //   remoteDir: decompressed_path,
        // });
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
      if (pre_download.major == null) return;
      const updateTarget = pre_download.patches.find(
        x => x.version == gameCurrentVersion()
      );
      if (updateTarget == null) return;
      const voicePacks = (
        await Promise.all(
          updateTarget.audio_pkgs.map(async x => {
            try {
              await stats(
                join(
                  _gameInstallDir(),
                  `Audio_${VoicePackNames[x.language]}_pkg_version`
                )
              );
              return x;
            } catch {
              return null;
            }
          })
        )
      )
        .filter(x => x != null)
        .map(x => {
          assertValueDefined(x);
          return x;
        });
      if (updateTarget.game_pkgs.length != 1) {
        throw new Error(
          "assertation failed (game_pkgs.length!= 1)! please file an issue."
        );
      }
      yield* predownloadGameProgram({
        aria2,
        updateFileZip: updateTarget.game_pkgs[0].url,
        gameDir: _gameInstallDir(),
        updateVoicePackZips: voicePacks.map(x => x.url),
      });
    },
    async *update() {
      const updateTarget = patches.find(x => x.version == gameCurrentVersion());
      if (!updateTarget) {
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
      const voicePacks = (
        await Promise.all(
          updateTarget.audio_pkgs.map(async x => {
            try {
              await stats(
                join(
                  _gameInstallDir(),
                  `Audio_${VoicePackNames[x.language]}_pkg_version`
                )
              );
              return x;
            } catch {
              return null;
            }
          })
        )
      )
        .filter(x => x != null)
        .map(x => {
          assertValueDefined(x);
          return x;
        });
      if (updateTarget.game_pkgs.length != 1) {
        throw new Error(
          "assertation failed (game_pkgs.length!= 1)! please file an issue."
        );
      }
      yield* updateGameProgram({
        aria2,
        server,
        currentGameVersion: gameCurrentVersion(),
        updatedGameVersion: GAME_LATEST_VERSION,
        updateFileZip: updateTarget.game_pkgs[0].url,
        gameDir: _gameInstallDir(),
        updateVoicePackZips: voicePacks.map(x => x.url),
      });
      batch(() => {
        setGameVersion(GAME_LATEST_VERSION);
      });
    },
    async *launch(config: Config) {
      if (
        gt(gameCurrentVersion(), CURRENT_SUPPORTED_VERSION) &&
        !config.patchOff
      ) {
        await locale.alert(
          "UNSUPPORTED_VERSION",
          "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
          [gameCurrentVersion()]
        );
        return;
      }
      if (config.reshade) {
        yield* checkAndDownloadReshade(aria2, wine, _gameInstallDir());
      }
      if (wine.attributes.renderBackend == "dxvk") {
        yield* checkAndDownloadDXVK(aria2);
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
      // FIXME: no pkg_version?
      // yield* checkIntegrityProgram({
      //   aria2,
      //   gameDir: _gameInstallDir(),
      //   remoteDir: decompressed_path,
      // });
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
          aria2,
          gameDir: _gameInstallDir(),
          remoteDir: decompressed_path,
        });
      }
    },
    async createConfig(locale: Locale, config: Partial<Config>) {
      const [PO] = await createPatchOff({ locale, config });

      return function () {
        return ["Game Version: ", gameCurrentVersion(), <PO />];
      };
    },
  };
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
      gameVersion: await getGameVersion2019(join(gameDir, server.dataDir)),
    } as const;
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
}
