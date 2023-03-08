import { Aria2 } from "./aria2";
import { Wine } from "./wine";
import {
  CN_SERVER,
  ServerContentData,
  ServerVersionData,
} from "./constants/server";
import {
  getKey,
  log,
  openDir,
  waitImageReady,
  readBinary,
  readAllLines,
  stats,
  fatal,
  setKey,
  removeFile,
  humanFileSize,
  writeFile,
} from "./utils";
import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Progress,
  ProgressIndicator,
} from "@hope-ui/solid";
import { createIcon } from "@hope-ui/solid";
import { batch, createSignal, Show } from "solid-js";
import { basename, join } from "path-browserify";
import { gt, lt } from "semver";
import {
  patchProgram,
  patchRevertProgram,
  patternSearch,
  putLocal,
} from "./patch";
import { doStreamUnzip, md5, mkdirp } from "./utils/unix";
import { CommonUpdateProgram } from "./common-update-ui";
import { Locale } from "./locale";

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

export async function checkGameState(locale: Locale) {
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
      gameVersion: await getGameVersion(join(gameDir, CN_SERVER.dataDir)), //FIXME:
    } as const;
  } catch {
    await locale.alert("CANT_OPEN_GAME_FILE", "CANT_OPEN_GAME_FILE_DESC");
    const selection = await openDir(locale.get("SELECT_INSTALLATION_DIR"));
    if (selection != gameDir) {
      await locale.alert("GAME_DIR_CHANGED", "GAME_DIR_CHANGED_DESC");
      return {
        gameInstalled: false,
      } as const;
    }
    return {
      gameInstalled: true,
      gameInstallDir: gameDir,
      gameVersion: await getGameVersion(join(gameDir, CN_SERVER.dataDir)), //FIXME:
    } as const;
  }
}

export async function createLauncher({
  aria2,
  wine,
  locale,
}: {
  aria2: Aria2;
  wine: Wine;
  locale: Locale;
}) {
  const server = CN_SERVER;
  const b: ServerContentData = await (await fetch(server.bg_url)).json();
  const c: ServerVersionData = await (await fetch(server.url)).json();
  const GAME_LATEST_VERSION = c.data.game.latest.version;
  await waitImageReady(b.data.adv.background);

  const { gameInstalled, gameInstallDir, gameVersion } = await checkGameState(
    locale
  );

  return function Laucnher() {
    // const bh = 40 / window.devicePixelRatio;
    // const bw = 136 / window.devicePixelRatio;
    const bh = 40;
    const bw = 136;

    const [statusText, setStatusText] = createSignal("");
    const [progress, setProgress] = createSignal(0);
    const [_gameInstalled, setGameInstalled] = createSignal(gameInstalled);
    const [_gameInstallDir, setGameInstallDir] = createSignal(
      gameInstallDir ?? ""
    );
    const [programBusy, setBusy] = createSignal(false);
    const [gameCurrentVersion, setGameCurrentVersion] = createSignal(
      gameVersion ?? "0.0.0"
    );

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

    async function onButtonClick() {
      if (programBusy()) return; // ignore
      if (_gameInstalled()) {
        // assert:
        taskQueue.next(async function* () {
          yield* launchGameProgram({
            gameDir: _gameInstallDir(),
            wine,
            gameExecutable: atob("WXVhblNoZW4uZXhl"),
          });
        });
      } else {
        const selection = await openDir(locale.get("SELECT_INSTALLATION_DIR"));
        if (!selection.startsWith("/")) {
          await locale.alert("PATH_INVALID", "PLEASE_SELECT_A_DIR");
          return;
        }
        try {
          await stats(join(selection, "pkg_version"));
        } catch {
          taskQueue.next(async function* () {
            yield* downloadAndInstallGameProgram({
              aria2,
              gameDir: selection,
              gameFileZip: c.data.game.latest.path,
              gameAudioZip: c.data.game.latest.voice_packs.find(
                (x) => x.language == "zh-cn"
              )!.path,
              gameVersion: GAME_LATEST_VERSION,
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
          await locale.alert("NOT_SUPPORTED_YET", "UPGRADE_FUNCTION_TBD");
          return;
        }
        taskQueue.next(async function* () {
          yield* checkIntegrityProgram({
            aria2,
            gameDir: selection,
            remoteDir: c.data.game.latest.decompressed_path,
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

    return (
      <div
        class="background"
        style={{
          "background-image": `url(${b.data.adv.background})`,
        }}
      >
        <div
          onClick={() => Neutralino.os.open(b.data.adv.url)}
          role="button"
          class="version-icon"
          style={{
            "background-image": `url(${b.data.adv.icon})`,
            height: `${bh}px`,
            width: `${bw}px`, //fixme: responsive size
          }}
        ></div>
        <Flex h="100vh" direction={"column-reverse"}>
          <Flex
            mr={"10vw"}
            ml={"10vw"}
            mb={50}
            columnGap="10vw"
            alignItems={"flex-end"}
          >
            <Box flex={1}>
              <Show when={programBusy()}>
                <h3
                  style={
                    "text-shadow: 1px 1px 2px #333;color:white;margin-bottom:5px;"
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
                  <ProgressIndicator borderRadius={8}></ProgressIndicator>
                </Progress>
              </Show>
            </Box>
            <Box>
              <ButtonGroup size="xl" attached minWidth={150}>
                <Button
                  mr="-1px"
                  disabled={programBusy()}
                  onClick={() => onButtonClick().catch(fatal)}
                >
                  {_gameInstalled()
                    ? locale.get("LAUNCH")
                    : locale.get("INSTALL")}
                </Button>
                <Show when={false && _gameInstalled()}>
                  <IconButton
                    fontSize={30}
                    aria-label="Settings"
                    icon={<IconSetting />}
                  />
                </Show>
              </ButtonGroup>
            </Box>
          </Flex>
        </Flex>
      </div>
    );
  };
}

import a from "../external/bWh5cHJvdDJfcnVubmluZy5yZWcK.reg?url";
async function* launchGameProgram({
  gameDir,
  gameExecutable,
  wine,
}: {
  gameDir: string;
  gameExecutable: string;
  wine: Wine;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "PATCHING"];
  yield* patchProgram(gameDir, wine.prefix, "cn");

  await putLocal(a, join(gameDir, "bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"));
  try {
    await wine.exec("regedit", [
      `"${wine.toWinePath(join(gameDir, "bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"))}"`,
    ]);
    await removeFile(join(gameDir, "bWh5cHJvdDJfcnVubmluZy5yZWcK.reg"));
    await wine.exec("copy", [
      `"${wine.toWinePath(join(gameDir, atob("bWh5cHJvdDMuc3lz")))}"`,
      '"%TEMP%\\\\"',
    ]);
    await wine.exec("copy", [
      `"${wine.toWinePath(join(gameDir, atob("SG9Zb0tQcm90ZWN0LnN5cw==")))}"`,
      '"%WINDIR%\\\\system32\\\\"',
    ]);
  } catch (e) {
    yield* patchRevertProgram(gameDir, wine.prefix, "cn");
    throw e;
  }
  try {
    yield ["setStateText", "GAME_RUNNING"];
    const g = wine.toWinePath(join(gameDir, gameExecutable));
    await wine.exec(`"${g}"`, [], {
      WINEESYNC: "1",
      WINEDEBUG: "-all",
      LANG: "zh_CN.UTF-8",
      DXVK_HUD: "fps",
      MVK_ALLOW_METAL_FENCES: "1",
      WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
      DXVK_ASYNC: "1",
    });
  } catch (e) {
    // it seems game crashed?
    await log(JSON.stringify(e));
  }

  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine.prefix, "cn");
}

async function* checkIntegrityProgram({
  gameDir,
  remoteDir,
  aria2,
}: {
  gameDir: string;
  remoteDir: string;
  aria2: Aria2;
}): CommonUpdateProgram {
  const entries: {
    remoteName: string;
    md5: string;
    fileSize: number;
  }[] = (await readAllLines(join(gameDir, "pkg_version")))
    .filter((x) => x.trim() != "")
    .map((x) => JSON.parse(x));
  const toFix: {
    remoteName: string;
    md5: string;
  }[] = [];
  let count = 0;
  yield [
    "setStateText",
    "SCANNING_FILES",
    String(count),
    String(entries.length),
  ];
  for (const entry of entries) {
    const localPath = join(gameDir, entry.remoteName);
    try {
      const fileStats = await stats(localPath);
      if (fileStats.size !== entry.fileSize) {
        throw new Error("Size not match");
      }
      const md5sum = await md5(localPath);
      if (md5sum !== entry.md5) {
        await log(`${md5sum} ${entry.md5} not match`);
        throw new Error("Md5 not match");
      }
    } catch {
      toFix.push(entry);
    }
    count++;
    yield [
      "setStateText",
      "SCANNING_FILES",
      String(count),
      String(entries.length),
    ];
    yield ["setProgress", (count / entries.length) * 100];
  }
  if (toFix.length == 0) {
    return;
  }
  yield ["setUndeterminedProgress"];

  yield ["setStateText", "FIXING_FILES", String(count), String(entries.length)];
  count = 0;
  for (const entry of toFix) {
    const localPath = join(gameDir, entry.remoteName);
    const remotePath = join(remoteDir, entry.remoteName).replace(":/", "://"); //....join: wtf?
    await log(remotePath);
    await log(localPath);
    for await (const progress of aria2.doStreamingDownload({
      uri: remotePath,
      absDst: localPath,
    })) {
      yield [
        "setStateText",
        "FIXING_FILES",
        String(count),
        String(entries.length),
      ];
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(100)) / progress.totalLength),
      ];
    }
    count++;
    // yield ['setStateText', 'COMPLETE_FILE', count, toFix.length]
  }
}

async function* downloadAndInstallGameProgram({
  aria2,
  gameFileZip,
  gameAudioZip,
  gameDir,
  gameVersion,
}: {
  gameFileZip: string;
  gameDir: string;
  gameAudioZip: string;
  gameVersion: string;
  aria2: Aria2;
}): CommonUpdateProgram {
  // FIXME: remove hardcoded data
  const gameChannel = 1;
  const gameSubchannel = 1;
  const gameCps = "pcadbdpz";

  const downloadTmp = join(gameDir, ".ariatmp");
  const gameFileTmp = join(downloadTmp, "game.zip");
  const audioFileTmp = join(downloadTmp, "audio.zip");
  await mkdirp(downloadTmp);
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];
  let gameFileStart = false;
  for await (const progress of aria2.doStreamingDownload({
    uri: gameFileZip,
    absDst: gameFileTmp,
  })) {
    if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
      continue;
    }
    gameFileStart = true;
    yield [
      "setStateText",
      "DOWNLOADING_FILE_PROGRESS",
      basename(gameFileZip),
      humanFileSize(Number(progress.downloadSpeed)),
      humanFileSize(Number(progress.completedLength)),
      humanFileSize(Number(progress.totalLength)),
    ];
    yield [
      "setProgress",
      Number((progress.completedLength * BigInt(100)) / progress.totalLength),
    ];
  }
  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
  for await (const [dec, total] of doStreamUnzip(gameFileTmp, gameDir)) {
    yield ["setProgress", (dec / total) * 100];
  }
  await removeFile(gameFileTmp);
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "ALLOCATING_FILE"];
  gameFileStart = false;
  for await (const progress of aria2.doStreamingDownload({
    uri: gameAudioZip,
    absDst: audioFileTmp,
  })) {
    if (!gameFileStart && progress.downloadSpeed == BigInt(0)) {
      continue;
    }
    gameFileStart = true;
    yield [
      "setStateText",
      "DOWNLOADING_FILE_PROGRESS",
      basename(gameAudioZip),
      humanFileSize(Number(progress.downloadSpeed)),
      humanFileSize(Number(progress.completedLength)),
      humanFileSize(Number(progress.totalLength)),
    ];
    yield [
      "setProgress",
      Number((progress.completedLength * BigInt(100)) / progress.totalLength),
    ];
  }
  yield ["setStateText", "DECOMPRESS_FILE_PROGRESS"];
  for await (const [dec, total] of doStreamUnzip(audioFileTmp, gameDir)) {
    yield ["setProgress", (dec / total) * 100];
  }
  await removeFile(audioFileTmp);
  await writeFile(
    join(gameDir, "config.ini"),
    `[General]
game_version=${gameVersion}
channel=${gameChannel}
sub_channel=${gameSubchannel}
cps=${gameCps}`
  );
}

// async function*
async function checkGameFolder() {
  return {
    valid: false,
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
