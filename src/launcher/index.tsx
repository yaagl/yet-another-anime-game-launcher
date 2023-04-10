import { Aria2 } from "../aria2";
import { createWineVersionChecker, Wine } from "../wine";
import {
  Server,
  ServerContentData,
  ServerVersionData,
} from "../constants/server";
import {
  getKey,
  log,
  openDir,
  waitImageReady,
  readBinary,
  stats,
  fatal,
  setKey,
  getFreeSpace,
} from "../utils";
import {
  Box,
  Button,
  ButtonGroup,
  createDisclosure,
  Flex,
  IconButton,
  Modal,
  ModalOverlay,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressIndicator,
} from "@hope-ui/solid";
import { createIcon } from "@hope-ui/solid";
import { batch, createSignal, Show } from "solid-js";
import { join } from "path-browserify";
import { gt, gte, lt } from "semver";
import { patchRevertProgram, patternSearch } from "./patch";
import { CommonUpdateProgram } from "../common-update-ui";
import { Locale } from "../locale";
import { createConfiguration } from "./config";
import { Github } from "../github";
import { downloadAndInstallGameProgram } from "./program-install-game";
import { predownloadGameProgram, updateGameProgram } from "./program-update-game";
import { checkIntegrityProgram } from "./program-check-integrity";
import { launchGameProgram } from "./program-launch-game";
import { createGameInstallationDirectorySanitizer } from "../accidental-complexity";
import { checkAndDownloadDXVK, checkAndDownloadFpsUnlocker } from "../downloadable-resource";
import { VoicePackNames } from "../constants";
import { checkAndDownloadReshade } from "../reshade";

const IconSetting = createIcon({
  viewBox: "0 0 1024 1024",
  path() {
    return (
      <path
        fill="currentColor"
        d="M396.72 320.592a141.184 141.184 0 0 1-99.824 15.92 277.648 277.648 0 0 0-45.344 74.576 141.216 141.216 0 0 1 37.52 95.952 141.248 141.248 0 0 1-41.728 100.32 274.4 274.4 0 0 0 49.952 86.224 141.264 141.264 0 0 1 107.168 14.176 141.216 141.216 0 0 1 63.984 79.296 274.72 274.72 0 0 0 86.816-1.92 141.248 141.248 0 0 1 66.016-86.304 141.216 141.216 0 0 1 101.856-15.488 277.648 277.648 0 0 0 41.92-76.544 141.184 141.184 0 0 1-36.128-94.4c0-34.912 12.768-67.68 34.816-92.96a274.736 274.736 0 0 0-38.192-70.032 141.264 141.264 0 0 1-105.792-14.56 141.312 141.312 0 0 1-67.168-90.912 274.4 274.4 0 0 0-92.784 0.016 141.152 141.152 0 0 1-63.088 76.64z m22.56-116.656c57.312-16 119.024-16.224 178.016 1.216a93.44 93.44 0 0 0 142.288 86.736 322.64 322.64 0 0 1 79.104 142.656 93.328 93.328 0 0 0-41.76 77.84 93.36 93.36 0 0 0 42.88 78.592 322.832 322.832 0 0 1-34.208 85.232 323.392 323.392 0 0 1-47.968 63.568 93.392 93.392 0 0 0-92.352 0.64 93.408 93.408 0 0 0-46.688 83.616 322.704 322.704 0 0 1-171.424 3.84 93.376 93.376 0 0 0-46.704-78.544 93.408 93.408 0 0 0-95.184 1.008A322.432 322.432 0 0 1 192 589.28a93.408 93.408 0 0 0 49.072-82.24c0-34.128-18.304-64-45.632-80.288a323.392 323.392 0 0 1 31.088-73.328 322.832 322.832 0 0 1 56.704-72.256 93.36 93.36 0 0 0 89.488-2.144 93.328 93.328 0 0 0 46.56-75.088z m92.208 385.28a68.864 68.864 0 1 0 0-137.76 68.864 68.864 0 0 0 0 137.76z m0 48a116.864 116.864 0 1 1 0-233.76 116.864 116.864 0 0 1 0 233.76z"
        p-id="2766"
      ></path>
    );
  },
});

const CURRENT_SUPPORTED_VERSION = "3.5.0";

export async function checkGameState(locale: Locale, server: Server) {
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
      gameVersion: await getGameVersion(join(gameDir, server.dataDir)),
    } as const;
  } catch {
    return {
      gameInstalled: false,
    } as const;
  }
}

export async function createLauncher({
  aria2,
  wine,
  locale,
  github,
  server,
}: {
  aria2: Aria2;
  wine: Wine;
  locale: Locale;
  github: Github;
  server: Server;
}) {
  const {
    data: {
      adv: { background, url, icon },
    },
  }: ServerContentData = await (
    await fetch(
      server.adv_url +
        (server.id == "CN"
          ? `&language=zh-cn` // CN server has no other language support
          : `&language=${locale.get("CONTENT_LANG_ID")}`)
    )
  ).json();
  const {
    data: {
      game: {
        diffs,
        latest: {
          version: GAME_LATEST_VERSION,
          path,
          decompressed_path,
          voice_packs,
          size,
        },
      },
      pre_download_game,
    },
  }: ServerVersionData = await (await fetch(server.update_url)).json();
  await waitImageReady(background);

  const { gameInstalled, gameInstallDir, gameVersion } = await checkGameState(
    locale,
    server
  );

  const [_gameInstallDir, setGameInstallDir] = createSignal(
    gameInstallDir ?? ""
  );
  const { UI: ConfigurationUI, config } = await createConfiguration({
    wine,
    wineVersionChecker: await createWineVersionChecker(github),
    locale,
    gameInstallDir: _gameInstallDir
  });

  const { selectPath } = await createGameInstallationDirectorySanitizer({
    openFolderDialog: async () =>
      await openDir(locale.get("SELECT_INSTALLATION_DIR")),
    locale,
  });

  let predownload_available = pre_download_game != null;
  try {
    await getKey("predownloaded_all");
    predownload_available = false; // already downloaded
  } catch {}
  const [showPredownload, setShowPredownload] = createSignal(
    predownload_available && gameInstalled
  );

  return function Launcher() {
    // const bh = 40 / window.devicePixelRatio;
    // const bw = 136 / window.devicePixelRatio;
    const bh = 40;
    const bw = 136;

    const [statusText, setStatusText] = createSignal("");
    const [progress, setProgress] = createSignal(0);
    const [_gameInstalled, setGameInstalled] = createSignal(gameInstalled);
    const [programBusy, setBusy] = createSignal(false);
    const [gameCurrentVersion, setGameCurrentVersion] = createSignal(
      gameVersion ?? "0.0.0"
    );
    const { isOpen, onOpen, onClose } = createDisclosure();

    const taskQueue: AsyncGenerator<any, void, () => CommonUpdateProgram> =
      (async function* () {
        while (true) {
          const task = yield 0;
          setBusy(true);
          try {
            for await (const text of task()) {
              switch (text[0]) {
                case "setProgress":
                  setProgress(text[1]);
                  break;
                case "setUndeterminedProgress":
                  setProgress(0);
                  break;
                case "setStateText":
                  setStatusText(locale.format(text[1], text.slice(2)));
                  break;
              }
            }
          } catch (e) {
            // fatal
            await fatal(e);
            return;
          }
          setBusy(false);
        }
      })();
    taskQueue.next(); // ignored anyway
    taskQueue.next(async function* () {
      try {
        await getKey("patched");
      } catch {
        return;
      }
      try {
        yield* patchRevertProgram(
          _gameInstallDir(),
          wine.prefix,
          server,
          config
        );
      } catch {
        yield* checkIntegrityProgram({
          aria2,
          gameDir: _gameInstallDir(),
          remoteDir: decompressed_path,
        });
      }
    });
    async function onButtonClick() {
      if (programBusy()) return; // ignore
      if (_gameInstalled()) {
        if(gte(gameCurrentVersion(), GAME_LATEST_VERSION)) {
          if (gt(gameCurrentVersion(), CURRENT_SUPPORTED_VERSION) && !config.patchOff) {
            await locale.alert(
              "UNSUPPORTED_VERSION",
              "PLEASE_WAIT_FOR_LAUNCHER_UPDATE",
              [gameCurrentVersion()]
            );
            return;
          }
          taskQueue.next(async function* () {
            if(config.reshade) {
              yield* checkAndDownloadReshade(aria2, wine, _gameInstallDir());
            }
            yield* checkAndDownloadDXVK(aria2);
            if(config.fpsUnlock!="default") {
              yield* checkAndDownloadFpsUnlocker(aria2);
            }
            yield* launchGameProgram({
              gameDir: _gameInstallDir(),
              wine,
              gameExecutable: server.executable,
              config,
              server,
            });
          });
        } else {
          const updateTarget = diffs.find(x=>x.version == gameCurrentVersion());
          if(!updateTarget) {
            await locale.prompt("UNSUPPORTED_VERSION", "GAME_VERSION_TOO_OLD_DESC", [gameCurrentVersion()]);
            batch(() => {
              setGameInstalled(false);
              setGameInstallDir("");
              setGameCurrentVersion("0.0.0");
            });
            await setKey("game_install_dir", null);
            return;
          }
          const voicePacks = (await Promise.all(updateTarget.voice_packs.map(async x=>{
            try {
              await stats(join(_gameInstallDir(), `Audio_${VoicePackNames[x.language]}_pkg_version`));
              return x;
            } catch {
              return null!;
            }
          }))).filter(x=>x!=null);
          taskQueue.next(async function* () {
            yield* updateGameProgram({
              aria2,
              server,
              currentGameVersion: gameCurrentVersion(),
              updatedGameVersion: GAME_LATEST_VERSION,
              updateFileZip: updateTarget.path,
              gameDir: _gameInstallDir(),
              updateVoicePackZips: voicePacks.map(x=>x.path)
            });
            batch(() => {
              setGameCurrentVersion(GAME_LATEST_VERSION);
            });
          });
        }
      } else {
        const selection = await selectPath();
        if (!selection) return;
        try {
          await stats(join(selection, "pkg_version"));
        } catch {
          const freeSpaceGB = await getFreeSpace(selection, "g");
          const requiredSpaceGB = Math.ceil(parseInt(size) / Math.pow(1024, 3)) * 1.2;
          if (freeSpaceGB < requiredSpaceGB) {
            await locale.alert(
              "NO_ENOUGH_DISKSPACE",
              "NO_ENOUGH_DISKSPACE_DESC",
              [requiredSpaceGB + "", (requiredSpaceGB*1.074).toFixed(1)]
            );
            return;
          }
          taskQueue.next(async function* () {
            yield* downloadAndInstallGameProgram({
              aria2,
              gameDir: selection,
              gameFileZip: path,
              // gameAudioZip: voice_packs.find((x) => x.language == "zh-cn")!
              //   .path,
              gameVersion: GAME_LATEST_VERSION,
              server,
            });
            // setGameInstalled
            batch(() => {
              setGameInstalled(true);
              setGameInstallDir(selection);
              setGameCurrentVersion(GAME_LATEST_VERSION);
            });
            await setKey("game_install_dir", selection);
          });
          return;
        }
        const gameVersion = await getGameVersion(
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
          const updateTarget = diffs.find(x=>x.version == gameVersion);
          if(!updateTarget) {
            await locale.prompt("UNSUPPORTED_VERSION", "GAME_VERSION_TOO_OLD_DESC", [gameVersion]);
            return;
          }
          batch(() => {
            setGameInstalled(true);
            setGameInstallDir(selection);
            setGameCurrentVersion(gameVersion);
          });
          await setKey("game_install_dir", selection);
          // FIXME: perform a integrity check?
        } else {
          taskQueue.next(async function* () {
            yield* checkIntegrityProgram({
              aria2,
              gameDir: selection,
              remoteDir: decompressed_path,
            });
            // setGameInstalled
            batch(() => {
              setGameInstalled(true);
              setGameInstallDir(selection);
              setGameCurrentVersion(gameVersion);
            });
            await setKey("game_install_dir", selection);
          });
        }
      }
    }


    const [nonUrgentStatusText, setNonUrgentStatusText] = createSignal("");
    const [nonUrgentProgress, setNonUrgentProgress] = createSignal(0);
    const [nonUrgentProgramBusy, setNonUrgentBusy] = createSignal(false);
    const nonUrgentTaskQueue: AsyncGenerator<
      any,
      void,
      () => CommonUpdateProgram
    > = (async function* () {
      while (true) {
        const task = yield 0;
        setNonUrgentBusy(true);
        try {
          for await (const text of task()) {
            switch (text[0]) {
              case "setProgress":
                setNonUrgentProgress(text[1]);
                break;
              case "setUndeterminedProgress":
                setNonUrgentProgress(0);
                break;
              case "setStateText":
                setNonUrgentStatusText(locale.format(text[1], text.slice(2)));
                break;
            }
          }
        } catch (e) {
          // fatal
          await fatal(e);
          return;
        }
        setNonUrgentBusy(false);
      }
    })();
    nonUrgentTaskQueue.next(); // ignored anyway

    async function predownload() {
      setShowPredownload(false);
      if(pre_download_game == null) return;
      const updateTarget = pre_download_game.diffs.find((x) => x.version == gameCurrentVersion());
      if(updateTarget == null) return;
      const voicePacks = (
        await Promise.all(
          updateTarget.voice_packs.map(async (x) => {
            try {
              await stats(
                join(
                  _gameInstallDir(),
                  `Audio_${VoicePackNames[x.language]}_pkg_version`
                )
              );
              return x;
            } catch {
              return null!;
            }
          })
        )
      ).filter((x) => x != null);
      nonUrgentTaskQueue.next(async function* () {
        yield* predownloadGameProgram({
          aria2,
          updateFileZip: updateTarget.path,
          gameDir: _gameInstallDir(),
          updateVoicePackZips: voicePacks.map((x) => x.path),
        });
      });
    }

    return (
      <div
        class="background"
        style={{
          "background-image": `url(${background})`,
        }}
      >
        <div
          onClick={() => Neutralino.os.open(url)}
          role="button"
          class="version-icon"
          style={{
            "background-image": `url(${icon})`,
            height: `${bh}px`,
            width: `${bw}px`, //fixme: responsive size
          }}
        ></div>
        <Flex h="100vh" direction={"column-reverse"}>
          <Flex
            mr={"calc(10vw + 2px)"} // 微操大师
            ml={"10vw"}
            mb={50}
            columnGap="10vw"
            alignItems={"flex-end"}
          >
            <Box flex={1}>
              <Show when={nonUrgentProgramBusy()}>
                <h3
                  style={
                    "text-shadow: 1px 1px 2px #333;color:white;margin-bottom:5px;margin-top:8px"
                  }
                >
                  {nonUrgentStatusText()}
                </h3>
                <Progress
                  value={nonUrgentProgress()}
                  indeterminate={nonUrgentProgress() == 0}
                  size="sm"
                  borderRadius={8}
                >
                  <ProgressIndicator
                    style={"transition: none;"}
                    borderRadius={8}
                  ></ProgressIndicator>
                </Progress>
              </Show>
              <Show when={programBusy()}>
                <h3
                  style={
                    "text-shadow: 1px 1px 2px #333;color:white;margin-bottom:5px;margin-top:8px;"
                  }
                >
                  {statusText()}
                </h3>
                <Progress
                  value={progress()}
                  indeterminate={progress() == 0}
                  size="sm"
                  borderRadius={8}
                >
                  <ProgressIndicator
                    style={"transition: none;"}
                    borderRadius={8}
                  ></ProgressIndicator>
                </Progress>
              </Show>
            </Box>
            <Popover placement="top" opened={showPredownload() && !isOpen()} onClose={()=>setShowPredownload(false)} closeOnBlur={true}>
              <PopoverTrigger as={Box}>
                <ButtonGroup
                  class="launch-button"
                  size="xl"
                  attached
                  minWidth={150}
                >
                  <Button
                    mr="-1px"
                    disabled={programBusy()}
                    onClick={() => onButtonClick().catch(fatal)}
                  >
                    {_gameInstalled()
                      ? gte(gameCurrentVersion() , GAME_LATEST_VERSION)
                        ? locale.get("LAUNCH")
                        : locale.get("UPDATE")
                      : locale.get("INSTALL")}
                  </Button>
                  <Show when={_gameInstalled()}>
                    <IconButton
                      onClick={onOpen}
                      disabled={programBusy()}
                      fontSize={30}
                      aria-label="Settings"
                      icon={<IconSetting />}
                    />
                  </Show>
                </ButtonGroup>
              </PopoverTrigger>
              <PopoverContent
                borderColor="$success3"
                bg="$success3"
                color="$success11"
                width={200}
              >
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverBody width={200}>
                  <Button id="predownload" colorScheme="success" size="sm" variant="ghost" onClick={predownload}>
                    {locale.format("PREDOWNLOAD_READY", [pre_download_game?.latest.version??""])}
                  </Button>
                </PopoverBody>
              </PopoverContent>
            </Popover>
            <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
              <ModalOverlay />
              <ConfigurationUI
                onClose={(action) => {
                  onClose();
                  if (action == "check-integrity") {
                    taskQueue.next(async function* () {
                      yield* checkIntegrityProgram({
                        aria2,
                        gameDir: _gameInstallDir(),
                        remoteDir: decompressed_path,
                      });
                    });
                  }
                }}
              ></ConfigurationUI>
            </Modal>
          </Flex>
        </Flex>
      </div>
    );
  };
}

async function getGameVersion(gameDataDir: string) {
  const ggmPath = join(gameDataDir, "globalgamemanagers");
  await log(ggmPath);
  const view = new Uint8Array(await readBinary(ggmPath));
  await log(`read ${view.byteLength} bytes`);
  const index = patternSearch(
    view,
    [
      0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67,
      0x6f, 0x72, 0x79, 0x2e,
    ]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    const len = index + 120;
    const v = new DataView(view.buffer);
    const strlen = v.getUint32(len, true);
    const str = String.fromCharCode(...view.slice(len + 4, len + strlen + 4));
    return str.split("_")[0];
  }
}
