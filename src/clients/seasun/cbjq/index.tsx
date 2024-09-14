import { batch, createSignal } from "solid-js";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  ChannelClient,
  ChannelClientInstallState,
} from "../../../channel-client";
import { Server } from "../server";
import { Locale } from "@locale";
import {
  assertValueDefined,
  exec,
  getFreeSpace,
  getKey,
  getKeyOrDefault,
  log,
  readFile,
  setKey,
  stats,
  waitImageReady,
} from "@utils";
import { join } from "path-browserify";
import { gt, lt } from "semver";
import { Config } from "@config";
// import { checkIntegrityProgram } from "../program-check-integrity";
// import {
//   predownloadGameProgram,
//   updateGameProgram,
// } from "./program-update-game";
import { downloadAndInstallGameProgram } from "./program-install-game";
import { launchGameProgram } from "./program-launch-game";
import { patchRevertProgram } from "./program-patch-game";
import { Aria2 } from "@aria2";
import { Wine } from "@wine";
import {
  checkAndDownloadDXMT,
  checkAndDownloadDXVK,
  checkAndDownloadJadeite,
  checkAndDownloadReshade,
} from "../../../downloadable-resource";
// import { getGameVersion } from "../unity";
import { LauncherResourceData } from "./launcher-info";
import { checkIntegrityProgram } from "./program-check-integrity";
import { updateGameProgram } from "./program-update-game";

const getGameVersion = async (gameDir: string) => {
  const local_manifest = join(gameDir, "manifest.json");
  const localResourceData: LauncherResourceData = await readFile(
    local_manifest,
  ).then(content => {
    return JSON.parse(content);
  });
  return localResourceData.projectVersion;
};

const CURRENT_SUPPORTED_VERSION = "2.0.0";

export async function createCBJQChannelClient({
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
  const resourceData = await getLatestVersionInfo(server);
  const { projectVersion: GAME_LATEST_VERSION }: LauncherResourceData =
    resourceData;
  await waitImageReady(server.background_url);

  const { gameInstalled, gameInstallDir, gameVersion } = await checkGameState(
    locale,
    server,
  );

  const [installed, setInstalled] = createSignal<ChannelClientInstallState>(
    gameInstalled ? "INSTALLED" : "NOT_INSTALLED",
  );
  const [showPredownloadPrompt, setShowPredownloadPrompt] =
    createSignal<boolean>(
      false, // TODO
    );
  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? "",
  );
  const [gameCurrentVersion, setGameVersion] = createSignal(
    gameVersion ?? "0.0.0",
  );
  const updateRequired = () => lt(gameCurrentVersion(), GAME_LATEST_VERSION);
  return {
    installState: installed,
    showPredownloadPrompt,
    installDir: _gameInstallDir,
    updateRequired,
    uiContent: {
      background: server.background_url,
      iconImage: "",
      url: "",
      launchButtonLocation: "left",
    },
    predownloadVersion: () => "", // TODO
    dismissPredownload() {
      setShowPredownloadPrompt(false);
    },
    async *install(selection: string): CommonUpdateProgram {
      const local_manifest = join(selection, "manifest.json");
      try {
        await stats(local_manifest);
      } catch {
        yield* downloadAndInstallGameProgram({
          aria2,
          gameDir: selection,
          resourceData,
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
      const gameVersion = await getGameVersion(selection);
      if (gt(gameVersion, CURRENT_SUPPORTED_VERSION)) {
        await locale.alert(
          "UNSUPPORTED_VERSION",
          "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
          [gameVersion],
        );
        return;
      } else if (lt(gameVersion, GAME_LATEST_VERSION)) {
        batch(() => {
          setInstalled("INSTALLED");
          setGameInstallDir(selection);
          setGameVersion(gameVersion);
        });
        await setKey("game_install_dir", selection);
        // FIXME: perform a integrity check?
      } else {
        yield* checkIntegrityProgram({
          resourceData,
          aria2,
          gameDir: selection,
          server,
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
      // IMPLEMENT ME
    },
    async *update() {
      yield* updateGameProgram({
        resourceData,
        aria2,
        gameDir: _gameInstallDir(),
        server,
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
          [gameCurrentVersion()],
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
        gameExecutable: "Game/Binaries/Win64/Game.exe",
        config,
        server,
      });
    },
    async *checkIntegrity() {
      yield* checkIntegrityProgram({
        resourceData,
        aria2,
        gameDir: _gameInstallDir(),
        server,
      });
    },
    async *init(config: Config) {
      try {
        await getKey("patched");
      } catch {
        return;
      }
      try {
        yield* patchRevertProgram(_gameInstallDir(), wine, config);
      } catch {
        // yield* checkIntegrityProgram({
        //   aria2,
        //   gameDir: _gameInstallDir(),
        //   remoteDir: decompressed_path,
        // });
      }
    },
    async createConfig() {
      return function () {
        return ["Game Version: ", gameCurrentVersion()];
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
      gameVersion: await getGameVersion(gameDir),
    } as const;
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
}

async function fetch(url: string) {
  const { stdOut } = await exec(["curl", url]);
  await log(stdOut);
  return {
    async json() {
      return JSON.parse(stdOut);
    },
  };
}

async function getLatestVersionInfo(
  server: Server,
): Promise<LauncherResourceData> {
  const ret: LauncherResourceData = await (await fetch(server.manifest)).json();
  return ret;
}
