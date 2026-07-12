import { launchGameProgram } from "./program-launch-game";
import {
  getVersionInfo,
  downloadManifest,
  parseManifest,
  buildDownloadList,
} from "./manifest";

import { batch, createSignal } from "solid-js";
import { join } from "path-browserify";
import { Config } from "@config";
import { CommonUpdateProgram } from "@common-update-ui";
import { ChannelClient, ChannelClientInstallState } from "../../channel-client";
import { Locale } from "@locale";
import { getKey, setKey, stats, alert as showAlert } from "@utils";
import { Aria2 } from "@aria2";
import { Wine } from "@wine";
import {
  checkAndDownloadDXMT,
  checkAndDownloadReshade,
} from "../../downloadable-resource";
import { Server } from "./server";
import { VERSION_INFO_URL, BACKUP_VERSION_INFO_URL, } from "./constants";

const GAME_INSTALL_DIR_KEY = "nte_game_install_dir";

async function getNTEVersionInfo() {
  const urls = [
    VERSION_INFO_URL,
    BACKUP_VERSION_INFO_URL,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      return await response.text();
    } catch {
      continue;
    }
  }

  throw new Error("Failed to fetch NTE Version.ini");
}

async function findGameExecutable(server: Server, gameDir: string) {
  for (const candidate of server.executableCandidates) {
    try {
      await stats(join(gameDir, candidate));
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

async function checkGameState(server: Server) {
  let gameDir = "";
  try {
    gameDir = await getKey(GAME_INSTALL_DIR_KEY);
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }

  const executable = await findGameExecutable(server, gameDir);
  if (executable == null) {
    return {
      gameInstalled: false,
    } as const;
  }

  return {
    gameInstalled: true,
    gameInstallDir: gameDir,
    gameExecutable: executable,
    gameVersion: "unknown",
  } as const;
}

async function showNteManifestMissingMessage(server: Server) {
  await showAlert(
    "NTE support is not ready yet",
    `${server.productName} has been added as a YAAGL channel, but download and update support still need the official launcher manifest/CDN URLs.`
  );
}

export async function createNTEChannelClient({
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
  const { gameInstalled, gameInstallDir, gameExecutable, gameVersion } =
    await checkGameState(server);

  const [installed, setInstalled] = createSignal<ChannelClientInstallState>(
    gameInstalled ? "INSTALLED" : "NOT_INSTALLED"
  );
  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? ""
  );
  const [_gameExecutable, setGameExecutable] = createSignal(
    gameExecutable ?? ""
  );
  const [gameCurrentVersion, setGameVersion] = createSignal(
    gameVersion ?? "unknown"
  );

  return {
    installState: installed,
    installDir: _gameInstallDir,
    showPredownloadPrompt: () => false,
    updateRequired: () => false,
    predownloadVersion: () => "",
    uiContent: {
      background: server.backgroundUrl,
      url: server.websiteUrl,
      launchButtonLocation: "left",
    },
    dismissPredownload() {
      return;
    },
    async *install(selection: string): CommonUpdateProgram {
      console.log("NTE INSTALL START");
      yield ["setUndeterminedProgress"];

      const versionInfo = await getNTEVersionInfo();

      const version = await getVersionInfo();
      console.log(version);
      const xml = await downloadManifest(version);
      console.log(xml.substring(0, 1500));
      const manifest = parseManifest(xml);
      console.log(manifest);
      const files = buildDownloadList(manifest);
      console.log(files.slice(0, 5));

      console.log("NTE Version.ini:", versionInfo);
      const executable = await findGameExecutable(server, selection);
      if (executable == null) {
        await showNteManifestMissingMessage(server);
        return;
      }

      batch(() => {
        setInstalled("INSTALLED");
        setGameInstallDir(selection);
        setGameExecutable(executable);
        setGameVersion("unknown");
      });
      await setKey(GAME_INSTALL_DIR_KEY, selection);
    },
    async *predownload() {
      await showNteManifestMissingMessage(server);
    },
    async *update() {
      await showNteManifestMissingMessage(server);
    },
    async *launch(config: Config) {
      if (_gameExecutable() == "") {
        await locale.alert(
          "UNSUPPORTED_VERSION",
          "GAME_VERSION_TOO_OLD_DESC",
          [server.productName]
        );
        return;
      }
      if (config.reshade) {
        yield* checkAndDownloadReshade(aria2, wine, _gameInstallDir());
      }
      if (wine.attributes.renderBackend == "dxmt") {
        yield* checkAndDownloadDXMT(aria2);
      }
      yield* launchGameProgram({
        gameDir: _gameInstallDir(),
        gameExecutable: _gameExecutable(),
        wine,
        config,
      });
    },
    async *checkIntegrity() {
      await showNteManifestMissingMessage(server);
    },
    async *init() {
      return;
    },
    async createConfig() {
      return function () {
        return ["Game Version: ", gameCurrentVersion()];
      };
    },
  };
}
