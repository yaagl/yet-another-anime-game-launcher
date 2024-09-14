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
import { Show } from "solid-js";
import { Locale } from "@locale";
import { createConfiguration } from "@config";
import { Github } from "../github";
import { createGameInstallationDirectorySanitizer } from "../accidental-complexity";
import { ChannelClient } from "../channel-client";
import { createTaskQueueState } from "./task-queue";
import { Wine } from "@wine";

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
    installDir,
    installState,
    showPredownloadPrompt,
    updateRequired,
    install,
    predownload,
    launch,
    update,
    checkIntegrity,
    init,
    uiContent: { background, url, iconImage, launchButtonLocation, logo },
    dismissPredownload,
    predownloadVersion,
    createConfig,
  },
}: {
  wine: Wine;
  locale: Locale;
  github: Github;
  channelClient: ChannelClient;
}) {
  const { UI: ConfigurationUI, config } = await createConfiguration({
    wine,
    locale,
    gameInstallDir: installDir,
    configForChannelClient: createConfig,
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
      { locale },
    );
    taskQueue.next(() => init(config));

    const [
      nonUrgentStatusText,
      nonUrgentProgress,
      nonUrgentProgramBusy,
      nonUrgentTaskQueue,
    ] = createTaskQueueState({ locale });

    const { isOpen, onOpen, onClose } = createDisclosure();

    async function onButtonClick() {
      if (programBusy()) return; // ignore
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

    return (
      <div
        class="background"
        style={{
          "background-image": `url(${background})`,
        }}
      >
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
            onClick={() => open(url)}
            role="button"
            class="version-icon"
            style={{
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
            <Popover
              placement="top"
              opened={showPredownloadPrompt() && !isOpen()}
              onClose={dismissPredownload}
              closeOnBlur={true}
            >
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
                    {installState() == "INSTALLED"
                      ? updateRequired()
                        ? locale.get("UPDATE")
                        : locale.get("LAUNCH")
                      : locale.get("INSTALL")}
                  </Button>
                  <Show when={installState() == "INSTALLED"}>
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
                  <Button
                    id="predownload"
                    colorScheme="success"
                    size="sm"
                    variant="ghost"
                    onClick={() => nonUrgentTaskQueue.next(predownload)}
                  >
                    {locale.format("PREDOWNLOAD_READY", [predownloadVersion()])}
                  </Button>
                </PopoverBody>
              </PopoverContent>
            </Popover>
            <Modal opened={isOpen()} onClose={onClose} scrollBehavior="inside">
              <ModalOverlay />
              <ConfigurationUI
                onClose={action => {
                  onClose();
                  if (action == "check-integrity") {
                    taskQueue.next(checkIntegrity);
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
