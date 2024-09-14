import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  VStack,
  notificationService,
} from "@hope-ui/solid";
import { CURRENT_YAAGL_VERSION, YAAGL_ADVANCED_ENABLE } from "../constants";
import { Locale } from "../locale";
import { Wine } from "../wine";
import { Config } from "./config-def";
import { createDxvkAsyncConfig } from "./dxvk-async";
import { createDxvkHUDConfig } from "./dxvk-hud";
import { createMetalHUDConfig } from "./metal-hud";
import { createGameInstallDirConfig } from "./game-install-dir";
import { createRetinaConfig } from "./retina";
import { createLeftCmdConfig } from "./left-cmd";
import { createWineDistroConfig } from "./wine-distribution";
import createLocaleConfig from "./ui-locale";
import createFPSUnlock from "./fps-unlock";
import { exec2, getKeyOrDefault, resolve, setKey } from "../utils";
import { createSignal, JSXElement, Show } from "solid-js";
import createReShade from "./reshade";

export async function createConfiguration({
  wine,
  locale,
  gameInstallDir,
  configForChannelClient,
}: {
  wine: Wine;
  locale: Locale;
  gameInstallDir: () => string;
  configForChannelClient: (
    locale: Locale,
    config: Partial<Config>,
  ) => Promise<() => JSXElement>;
}) {
  const config: Partial<Config> = {};
  const [WD] = await createWineDistroConfig({
    locale,
    config,
  });
  const [DA] = await createDxvkAsyncConfig({ locale, config });
  const [DH] = await createDxvkHUDConfig({ locale, config });
  const [MH] = await createMetalHUDConfig({ locale, config });
  const [R] = await createRetinaConfig({ locale, config });
  const [LC] = await createLeftCmdConfig({ locale, config });
  const [GID] = await createGameInstallDirConfig({
    locale,
    config,
    gameInstallDir,
  });

  const [UL] = await createLocaleConfig({ locale, config });
  const [FO] = await createFPSUnlock({ locale, config });
  const [RS] = await createReShade({ locale, config });

  const ChannelClientConfig = await configForChannelClient(locale, config);

  const _advancedSetting =
    YAAGL_ADVANCED_ENABLE &&
    (await getKeyOrDefault("config_advanced", "false")) == "true";

  const [advanceSetting, setAdvancedSetting] = createSignal(_advancedSetting);

  const clickTimestamp: number[] = [];
  async function onClickVersion() {
    if (!YAAGL_ADVANCED_ENABLE) {
      return;
    }
    clickTimestamp.push(Date.now());
    if (clickTimestamp.length > 5) {
      if (
        clickTimestamp[clickTimestamp.length - 1] -
          clickTimestamp[clickTimestamp.length - 5] <
        1000
      ) {
        if (!advanceSetting()) {
          notificationService.show({
            status: "info",
            title: locale.get("SETTING_ADVANCED_VISIBLE"),
            description: "",
          });
        }
        setAdvancedSetting(x => !x);
        clickTimestamp.length = 0;
        await setKey("config_advanced", String(advanceSetting()));
      }
    }
  }

  return {
    UI: function (props: {
      onClose: (action: "check-integrity" | "close") => void;
    }) {
      return (
        <ModalContent height={570} width={1000} maxWidth={1000}>
          <ModalCloseButton />
          <ModalHeader>{locale.get("SETTING")}</ModalHeader>
          <ModalBody pb={20}>
            <Tabs orientation="vertical" h="100%">
              <TabList minW={120}>
                <Tab>{locale.get("SETTING_GENERAL")}</Tab>
                <Tab>{locale.get("SETTING_GAME")}</Tab>
                <Tab>Wine</Tab>
                <Show when={advanceSetting()}>
                  <Tab>{locale.get("SETTING_ADVANCED")}</Tab>
                </Show>
              </TabList>
              <TabPanel flex={1} pt={0} pb={0}>
                <HStack spacing={"$4"} h="100%">
                  <Box
                    width="40%"
                    alignSelf="stretch"
                    overflowY="scroll"
                    pr={16}
                  >
                    <VStack spacing={"$4"}>
                      <GID />
                      <Divider />
                      <DA />
                      <DH />
                      <MH />
                      <R />
                      <LC />
                      <Divider />
                      <UL />
                      <FormControl>
                        <FormLabel>
                          {locale.get("SETTING_YAAGL_VERSION")}
                        </FormLabel>
                        <Text userSelect={"none"} onClick={onClickVersion}>
                          {CURRENT_YAAGL_VERSION}
                        </Text>
                      </FormControl>
                    </VStack>
                  </Box>
                  <Box flex={1} />
                  <VStack
                    spacing={"$1"}
                    width="30%"
                    alignItems="start"
                    alignSelf="start"
                  >
                    <Heading level="1" ml={12} mb={"$4"}>
                      {locale.get("SETTING_QUICK_ACTIONS")}
                    </Heading>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => props.onClose("check-integrity")}
                    >
                      {locale.get("SETTING_CHECK_INTEGRITY")}
                    </Button>
                    <Divider />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        wine.openCmdWindow({
                          gameDir: gameInstallDir(),
                        })
                      }
                    >
                      {locale.get("SETTING_OPEN_CMD")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        exec2(
                          ["open", gameInstallDir()],
                          {},
                          false,
                          "/dev/null",
                        )
                      }
                    >
                      {locale.get("SETTING_OPEN_GAME_INSTALL_DIR")}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () =>
                        await exec2(
                          ["open", resolve("./")],
                          {},
                          false,
                          "/dev/null",
                        )
                      }
                    >
                      {locale.get("SETTING_OPEN_YAAGL_DIR")}
                    </Button>
                  </VStack>
                </HStack>
              </TabPanel>
              <TabPanel flex={1} pt={0} pb={0} h="100%">
                <VStack spacing={"$4"} w="40%" alignItems="start">
                  <ChannelClientConfig />
                </VStack>
              </TabPanel>
              <TabPanel flex={1} pt={0} pb={0} h="100%">
                <VStack spacing={"$4"} w="40%" alignItems="start">
                  <WD />
                </VStack>
              </TabPanel>
              <Show when={advanceSetting()}>
                <TabPanel flex={1} pt={0} pb={0} h="100%">
                  <VStack spacing={"$4"} w="40%" alignItems="start">
                    <Alert status="warning" variant="left-accent">
                      <AlertIcon mr="$2_5" />
                      {locale.get("SETTING_ADVANCED_ALERT")}
                    </Alert>
                    <FO />
                    <RS />
                  </VStack>
                </TabPanel>
              </Show>
            </Tabs>
          </ModalBody>
        </ModalContent>
      );
    },
    config: config as Config, // FIXME: better method than type assertation?
  };
}

export type { Config };
