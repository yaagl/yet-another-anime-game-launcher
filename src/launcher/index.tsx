import { openDir, fatal, open } from "@utils";
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
import { Show, createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { createConfiguration } from "@config";
import { Github } from "../github";
import { createGameInstallationDirectorySanitizer } from "../accidental-complexity";
import { ChannelClient } from "../channel-client";
import { createTaskQueueState } from "./task-queue";
import { Wine } from "@wine";
import { canPlay } from "../sophon/game";
import { DownloadDetails } from "./download-details";
import type { SophonActivity } from "../sophon/activity";
import { InstallOptions } from "./install-options";

function ActionIcon(props: { action: string }) {
  const paths: Record<string, string> = {
    play: "M8 5v14l11-7z",
    resume: "M5 5v14M10 5v14l10-7z",
    install: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    update: "M20 7a9 9 0 1 0 1 8M20 3v5h-5",
    retry: "M20 7a9 9 0 1 0 1 8M20 3v5h-5",
    checking: "M20 7a9 9 0 1 0 1 8M20 3v5h-5",
    details: "M4 20h16M7 16v-4m5 4V4m5 12V8",
    pause: "M8 5v14M16 5v14",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      style={{ "margin-right": "8px" }}
    >
      <path d={paths[props.action]} />
    </svg>
  );
}

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

export async function createLauncher({
  wine,
  locale,
  github,
  channelClient: {
    sophon,
    installDir,
    installState,
    supportsD3d12,
    showPredownloadPrompt,
    updateRequired,
    install,
    predownload,
    launch,
    update,
    checkIntegrity,
    init,
    uiContent: {
      background,
      background_video,
      background_theme,
      url,
      iconImage,
      launchButtonLocation,
      logo,
    },
    dismissPredownload,
    predownloadVersion,
    createConfig,
  },
  onCheckUpdate,
}: {
  wine: Wine;
  locale: Locale;
  github: Github;
  channelClient: ChannelClient;
  onCheckUpdate: () => void;
}) {
  async function reportError(error: unknown) {
    if (sophon)
      await Neutralino.os.showMessageBox("Error", String(error), "OK");
    else await fatal(error);
  }
  const { UI: ConfigurationUI, config } = await createConfiguration({
    wine,
    locale,
    gameInstallDir: installDir,
    configForChannelClient: createConfig,
    supportsD3d12,
    sophon,
    onCheckUpdate,
  });

  const { selectPath } = await createGameInstallationDirectorySanitizer({
    openFolderDialog: async () =>
      await openDir(locale.get("SELECT_INSTALLATION_DIR")),
    locale,
  });

  return function Launcher() {
    // const bh = 40 / window.devicePixelRatio;
    // const bw = 136 / window.devicePixelRatio;
    const bh = 40;
    const bw = 136;

    const [statusText, progress, programBusy, taskQueue] = createTaskQueueState(
      { locale, onError: sophon ? reportError : undefined }
    );
    taskQueue.next(() => init(config));

    const [
      nonUrgentStatusText,
      nonUrgentProgress,
      nonUrgentProgramBusy,
      nonUrgentTaskQueue,
    ] = createTaskQueueState({
      locale,
      onError: sophon ? reportError : undefined,
    });

    const { isOpen, onOpen, onClose } = createDisclosure();
    const details = createDisclosure();
    const [installDialog, setInstallDialog] = createSignal<
      "install" | "verify"
    >();

    const [videoLoaded, setVideoLoaded] = createSignal(false);
    let video: HTMLVideoElement | undefined;
    createEffect(() => {
      if (!videoLoaded()) return;
      if (details.isOpen() || installDialog()) video?.pause();
      else video?.play().catch(() => undefined);
    });

    async function chooseGameDirectory() {
      const directory = await selectPath();
      if (directory) await sophon?.selectDirectory(directory);
    }

    async function onButtonClick() {
      if (programBusy()) return; // ignore
      if (sophon) {
        if (!installDir()) {
          await chooseGameDirectory();
          return;
        }
        if (sophon.error()) {
          await sophon.refresh();
          if (sophon.error()) throw new Error(sophon.error());
        }
        if (sophon.action()?.action === "install") {
          setInstallDialog("install");
        } else if (canPlay(sophon.action())) {
          taskQueue.next(() => launch(config));
        } else {
          taskQueue.next(() => sophon.performAction());
        }
        return;
      }
      if (installState() == "INSTALLED") {
        if (updateRequired() == true) {
          taskQueue.next(update);
        } else {
          taskQueue.next(() => launch(config));
        }
      } else {
        const selection = await selectPath();
        if (!selection) return;
        taskQueue.next(() => install(selection));
      }
    }

    function primaryAction() {
      if (sophon?.loading()) return "checking";
      if (sophon?.error()) return "retry";
      if (sophon) {
        const next = sophon.action();
        if (canPlay(next)) return "play";
        if (next?.action === "resumeInstall" || next?.action === "resumeUpdate")
          return "resume";
        if (next?.action === "update" || next?.sourceVersion) return "update";
        return "install";
      }
      return installState() === "INSTALLED"
        ? updateRequired()
          ? "update"
          : "play"
        : "install";
    }

    function primaryLabel() {
      switch (primaryAction()) {
        case "checking":
          return locale.get("CHECKING_GAME");
        case "retry":
          return locale.get("D3DMETAL_LICENSE_RETRY");
        case "resume":
          return locale.get("RESUME");
        case "update":
          return locale.get("UPDATE");
        case "play":
          return locale.get("LAUNCH");
        default:
          return locale.get("INSTALL");
      }
    }

    return (
      <div
        class="background"
        style={{
          "background-image": background ? `url(${background})` : undefined,
        }}
      >
        <Show when={background_video}>
          <video
            ref={video}
            class="background-video"
            src={background_video}
            autoplay
            loop
            muted
            playsinline
            onLoadedData={() => setVideoLoaded(true)}
            style={{
              opacity: videoLoaded() ? 1 : 0,
              transition: "opacity 0.5s ease-in",
            }}
          />
        </Show>
        <Show when={background_theme}>
          <div
            class="background-theme"
            style={{
              "background-image": `url(${background_theme})`,
              // HACK: always load video overlay image.
              // Image seems to align with overlay. Fix for ZZZ not having text in image.
            }}
          />
        </Show>
        {logo ? (
          <div
            class="game-logo"
            style={{
              "background-image": `url(${logo})`,
              height: `${234}px`,
              width: `${416}px`, //fixme: responsive size
            }}
          />
        ) : null}
        {iconImage ? (
          <div
            onClick={() => url && open(url)}
            role={url ? "button" : undefined}
            class="version-icon"
            style={{
              cursor: url ? "pointer" : "default",
              "background-image": `url(${iconImage})`,
              height: `${bh}px`,
              width: `${bw}px`, //fixme: responsive size
            }}
          />
        ) : null}
        <Flex h="100vh" direction={"column-reverse"}>
          <Flex
            direction={launchButtonLocation == "left" ? "row-reverse" : "row"}
            mr={"calc(10vw + 2px)"} // 微操大师
            ml={"10vw"}
            mb={50}
            columnGap="10vw"
            alignItems={"flex-end"}
          >
            <Box flex={1} minWidth={0}>
              <Show when={sophon?.error()}>
                <p role="alert">{sophon?.error()}</p>
              </Show>
              <Show when={nonUrgentProgramBusy()}>
                <h3
                  style={
                    (sophon && !background
                      ? ""
                      : "text-shadow: 1px 1px 2px #333;color:white;") +
                    "margin-bottom:5px;margin-top:8px"
                  }
                >
                  {nonUrgentStatusText()}
                </h3>
                <Progress
                  value={nonUrgentProgress()}
                  indeterminate={nonUrgentProgress() == 0}
                  size="sm"
                  borderRadius={12}
                >
                  <ProgressIndicator
                    style={"transition: none;"}
                    borderRadius={12}
                  ></ProgressIndicator>
                </Progress>
              </Show>
              <Show when={programBusy()}>
                <h3
                  style={
                    (sophon && !background
                      ? ""
                      : "text-shadow: 1px 1px 2px #333;color:white;") +
                    "margin-bottom:5px;margin-top:8px;"
                  }
                >
                  {statusText()}
                </h3>
                <Progress
                  value={progress()}
                  indeterminate={progress() == 0}
                  size="sm"
                  borderRadius={12}
                >
                  <ProgressIndicator
                    style={"transition: none;"}
                    borderRadius={12}
                  ></ProgressIndicator>
                </Progress>
              </Show>
            </Box>
            <Flex direction="column" gap="$2" flexShrink={0}>
              <Show when={sophon?.activity() || sophon?.operationRunning()}>
                <ButtonGroup
                  class="launch-button"
                  role="group"
                  aria-label="Download controls"
                  size="sm"
                  variant="subtle"
                  attached
                  alignSelf={
                    launchButtonLocation === "left" ? "flex-start" : "flex-end"
                  }
                  opacity={0.85}
                  _hover={{ opacity: 1 }}
                  transition="opacity 0.2s"
                  borderRadius={12}
                  overflow="hidden"
                >
                  <Show when={sophon?.activity()}>
                    <Button onClick={details.onOpen}>
                      <ActionIcon action="details" />
                      Stats for nerds
                    </Button>
                  </Show>
                  <Show when={sophon?.operationRunning()}>
                    <Button
                      disabled={sophon?.cancelling()}
                      onClick={() => sophon?.cancel().catch(reportError)}
                    >
                      <ActionIcon action="pause" />
                      {locale.get(sophon?.cancelling() ? "PAUSING" : "PAUSE")}
                    </Button>
                  </Show>
                </ButtonGroup>
              </Show>
              <Popover
                placement="top"
                opened={
                  showPredownloadPrompt() && !isOpen() && !installDialog()
                }
                onClose={dismissPredownload}
                closeOnBlur={true}
              >
                <PopoverTrigger as={Box}>
                  <ButtonGroup
                    class="launch-button"
                    size="xl"
                    attached
                    minWidth={150}
                    opacity={0.85}
                    _hover={{ opacity: 1 }}
                    transition="opacity 0.2s"
                    borderRadius={12}
                    overflow="hidden"
                  >
                    <Button
                      mr="-1px"
                      disabled={
                        programBusy() ||
                        sophon?.loading() ||
                        (sophon?.operationRunning() &&
                          !canPlay(sophon.action()))
                      }
                      onClick={() => onButtonClick().catch(reportError)}
                    >
                      <Show when={sophon}>
                        <ActionIcon action={primaryAction()} />
                      </Show>
                      {primaryLabel()}
                    </Button>
                    <Show when={sophon}>
                      <IconButton
                        aria-label={locale.get("SELECT_INSTALLATION_DIR")}
                        disabled={
                          programBusy() ||
                          sophon?.operationRunning() ||
                          sophon?.loading()
                        }
                        onClick={() => chooseGameDirectory().catch(reportError)}
                        icon={
                          <svg
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            aria-hidden="true"
                          >
                            <path d="M3 5h6l2 3h10v12H3z" />
                          </svg>
                        }
                      />
                    </Show>
                    <IconButton
                      onClick={onOpen}
                      disabled={
                        programBusy() ||
                        sophon?.operationRunning() ||
                        sophon?.loading()
                      }
                      fontSize={30}
                      aria-label="Settings"
                      icon={<IconSetting />}
                    />
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
                    <Button
                      id="predownload"
                      colorScheme="success"
                      size="sm"
                      variant="ghost"
                      disabled={
                        nonUrgentProgramBusy() ||
                        sophon?.loading() ||
                        sophon?.operationRunning()
                      }
                      onClick={() => nonUrgentTaskQueue.next(predownload)}
                    >
                      {sophon?.action()?.action === "resumeUpdate"
                        ? locale.get("RESUME") + " · "
                        : ""}
                      {locale.format("PREDOWNLOAD_READY", [
                        predownloadVersion(),
                      ])}
                    </Button>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </Flex>
            <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
              <ModalOverlay />
              <ConfigurationUI
                onClose={action => {
                  onClose();
                  if (action == "check-integrity") {
                    if (sophon) setInstallDialog("verify");
                    else taskQueue.next(checkIntegrity);
                  }
                }}
              ></ConfigurationUI>
            </Modal>
          </Flex>
        </Flex>
        <Show when={installDialog() && sophon}>
          {game => (
            <Modal
              opened={Boolean(installDialog())}
              onClose={() => setInstallDialog(undefined)}
              centered
              scrollBehavior="inside"
            >
              <ModalOverlay />
              <InstallOptions
                game={game()}
                verification={installDialog() === "verify"}
                selectPath={selectPath}
                onClose={() => setInstallDialog(undefined)}
                onConfirm={selection => {
                  const client = game();
                  const verification = installDialog() === "verify";
                  const directory = installDir();
                  setInstallDialog(undefined);
                  taskQueue.next(() =>
                    verification
                      ? client.checkIntegrity(selection)
                      : client.install(directory, selection)
                  );
                }}
              />
            </Modal>
          )}
        </Show>
        <Show when={details.isOpen() && sophon?.activity()}>
          <Modal
            opened={details.isOpen()}
            onClose={details.onClose}
            size="full"
            scrollBehavior="inside"
            motionPreset="none"
          >
            <ModalOverlay />
            <DownloadDetails
              locale={locale}
              activity={sophon?.activity() as SophonActivity}
              history={sophon?.history() ?? []}
              cancelling={sophon?.cancelling() ?? false}
              onClose={details.onClose}
              onCancel={() => sophon?.cancel().catch(reportError)}
            />
          </Modal>
        </Show>
      </div>
    );
  };
}
