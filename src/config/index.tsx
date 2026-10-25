import {
  Alert,
  AlertIcon,
  Box,
  createIcon,
  IconButton,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Text,
  VStack,
  notificationService,
  useColorMode,
} from "@hope-ui/solid";
import { CURRENT_YAAGL_VERSION, YAAGL_ADVANCED_ENABLE } from "../constants";
import { Locale } from "../locale";
import { getWineDistributions, Wine, WineDistribution } from "../wine";
import { Config } from "./config-def";
import { createMetalHUDConfig } from "./metal-hud";
import { createGameInstallDirConfig } from "./game-install-dir";
import { createRetinaConfig } from "./retina";
import { createLeftCmdConfig } from "./left-cmd";
import { createWineDistroConfig } from "./wine-distribution";
import { createD3D12 } from "./d3d12";
import { createMaxFrameRateConfig } from "./max-framerate";
import createLocaleConfig from "./ui-locale";
import createFPSUnlock from "./fps-unlock";
import { exec2, getKeyOrDefault, resolve, setKey } from "../utils";
import { createSignal, For, JSXElement, Show } from "solid-js";
import createReShade from "./reshade";
import { createProxyEnabledConfig } from "@config/proxy-enabled";
import { createProxyHostConfig } from "@config/proxy-host";
import { SophonSettingsPanel } from "./sophon";
import type { SophonGame } from "../sophon/game";
import { createWorkaround3Config } from "../clients/mhy/hk4e/config/workaround-3";
import createPatchOff from "../clients/mhy/hk4e/config/patch-off";
import createSteamPatch from "../clients/mhy/hk4e/config/steam-patch";
import createBlockNet from "../clients/mhy/hk4e/config/block-net";
import { createEnableHDRConfig } from "../clients/mhy/hk4e/config/enable-hdr";
import createResolution from "../clients/mhy/hk4e/config/resolution";
import createTimeoutFix from "../clients/mhy/hk4e/config/timeout-fix";

export const RECOMMENDED_WINE_TAG = "11.0-1-crossover-signed-experimental";
export const RECOMMENDED_WINE_URL =
  "https://github.com/yaagl/anime-game-wine/releases/download/wine-crossover-11.0-1-signed/wine-crossover-11.0-1-osx64-signed.tar.xz";

export async function applyRecommendedSettings() {
  const channelClient = String(import.meta.env["YAAGL_CHANNEL_CLIENT"]);
  const currentWineState = await getKeyOrDefault("wine_state", "");
  const currentWineTag = await getKeyOrDefault("wine_tag", "");

  if (currentWineState !== "ready" || currentWineTag !== RECOMMENDED_WINE_TAG) {
    await setKey("wine_state", "update");
    await setKey("wine_update_tag", RECOMMENDED_WINE_TAG);
    await setKey("wine_update_url", RECOMMENDED_WINE_URL);
  }

  if (channelClient.startsWith("hk4e") || channelClient.startsWith("nap")) {
    await setKey("config_steam_patch", "true");
    await setKey("config_timeout_fix", "true");
    await setKey("config_block_net", "false");
  }

  if (channelClient.startsWith("hkrpg")) {
    await setKey("config_block_net", "true");
  }
}

const IconSun = createIcon({
  viewBox: "0 0 24 24",
  path: () => (
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </g>
  ),
});

const IconMoon = createIcon({
  viewBox: "0 0 24 24",
  path: () => (
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </g>
  ),
});

export async function createConfiguration({
  wine,
  locale,
  gameInstallDir,
  configForChannelClient,
  supportsD3d12 = false,
  sophon,
  onCheckUpdate,
}: {
  wine: Wine;
  locale: Locale;
  gameInstallDir: () => string;
  configForChannelClient: (
    locale: Locale,
    config: Partial<Config>
  ) => Promise<() => JSXElement>;
  supportsD3d12?: boolean;
  sophon?: SophonGame;
  onCheckUpdate: () => void;
}) {
  const config: Partial<Config> = {};
  const [WD] = await createWineDistroConfig({
    locale,
    config,
  });
  const [D3D12] = await createD3D12({ locale, config, wine });
  const [MFR] = await createMaxFrameRateConfig({ locale, config });
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

  const [PRE] = await createProxyEnabledConfig({ locale, config });
  const [PRH] = await createProxyHostConfig({ locale, config });

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
      const { colorMode, toggleColorMode } = useColorMode();

      const cardStyle = {
        bg: "$neutral2",
        borderWidth: "1px",
        borderColor: "$neutral5",
        borderRadius: 12,
        p: "$6",
        w: "100%",
        shadow: "$sm",
      };

      const sidebarStyle = {
        bg: "$neutral3",
        borderRightWidth: "1px",
        borderColor: "$neutral5",
        minW: "220px",
        p: "$4",
        pt: "$6",
        display: "flex",
        flexDirection: "column" as any,
      };

      const tabStyle = {
        justifyContent: "flex-start",
        borderRadius: "$lg",
        mb: "$2",
        px: "$4",
        py: "$2_5",
        fontSize: "$md",
        fontWeight: 500,
        color: "$neutral11",
        _selected: { bg: "$neutral6", color: "$neutral12", fontWeight: 600 },
        _hover: { bg: "$neutral5" },
        transition: "all 0.2s",
      };

      const actionBtnStyle = {
        variant: "subtle" as any,
        w: "100%",
        justifyContent: "flex-start",
        size: "sm" as any,
        borderRadius: "$md",
        bg: "transparent",
        _hover: { bg: "$neutral4" },
      };

      const dangerBtnStyle = {
        ...actionBtnStyle,
        colorScheme: "danger" as any,
        color: "$danger11",
        _hover: { bg: "$danger4" },
      };

      const QuickActionsPanel = () => (
        <Box
          w="300px"
          h="100%"
          borderLeftWidth="1px"
          borderColor="$neutral5"
          bg="$neutral2"
          p="$6"
          pt="$14"
          overflowY="auto"
        >
          <VStack spacing="$2" alignItems="stretch">
            <Text mb="$4" fontSize="$md" fontWeight={600} color="$neutral12">
              {locale.get("SETTING_QUICK_ACTIONS")}
            </Text>

            <Button
              {...actionBtnStyle}
              onClick={() => props.onClose("check-integrity")}
            >
              {locale.get("SETTING_CHECK_INTEGRITY")}
            </Button>
            <Button
              {...actionBtnStyle}
              onClick={async () => {
                await applyRecommendedSettings();

                notificationService.show({
                  status: "success",
                  title: locale.get("SETTING_RECOMMENDED_SETTINGS_APPLIED"),
                  description: locale.get(
                    "SETTING_RECOMMENDED_SETTINGS_APPLIED_DESC"
                  ),
                });
              }}
            >
              {locale.get("SETTING_APPLY_RECOMMENDED_SETTINGS")}
            </Button>

            <Divider my="$4" />

            <Button
              {...actionBtnStyle}
              onClick={() => wine.openCmdWindow({ gameDir: gameInstallDir() })}
            >
              {locale.get("SETTING_OPEN_CMD")}
            </Button>
            <Button
              {...actionBtnStyle}
              onClick={() =>
                exec2(["open", gameInstallDir()], {}, false, "/dev/null")
              }
            >
              {locale.get("SETTING_OPEN_GAME_INSTALL_DIR")}
            </Button>
            <Button
              {...actionBtnStyle}
              onClick={async () =>
                await exec2(["open", resolve("./")], {}, false, "/dev/null")
              }
            >
              {locale.get("SETTING_OPEN_YAAGL_DIR")}
            </Button>

            <Divider my="$4" />

            <Button {...actionBtnStyle} onClick={onCheckUpdate}>
              {locale.get("SETTING_CHECK_UPDATE")}
            </Button>

            <Divider my="$4" />

            <Button
              {...dangerBtnStyle}
              onClick={async () => {
                const confirm = await Neutralino.os.showMessageBox(
                  locale.get("SETTING_UNINSTALL_YAAGL"),
                  locale.get("SETTING_UNINSTALL_YAAGL_DESC"),
                  "YES_NO",
                  "WARNING"
                );
                if (confirm === "YES") {
                  const dataDir = await resolve("./");
                  if (
                    dataDir.length > 10 &&
                    dataDir.includes("Application Support")
                  ) {
                    await exec2(
                      ["sh", "-c", `sleep 2 && rm -rf "${dataDir}"`],
                      {},
                      true
                    );
                    await Neutralino.app.exit();
                  } else {
                    await Neutralino.os.showMessageBox(
                      "Uninstall Failed",
                      `Could not safely determine the Yaagl OS folder path (${dataDir}). Please delete it manually.`,
                      "OK",
                      "ERROR"
                    );
                  }
                }
              }}
            >
              {locale.get("SETTING_UNINSTALL_YAAGL")}
            </Button>
          </VStack>
        </Box>
      );

      return (
        <ModalContent
          height={650}
          width={1000}
          maxWidth={1000}
          borderRadius={12}
          overflow="hidden"
          bg="$neutral1"
        >
          <ModalCloseButton zIndex={10} top="$4" right="$4" />
          <ModalBody p={0} h="100%">
            <HStack spacing={0} h="100%" alignItems="flex-start">
              {/* Left Side: Settings Content */}
              <Tabs orientation="vertical" h="100%" variant="pills" flex={1}>
                <TabList {...sidebarStyle}>
                  <Text
                    px="$4"
                    py="$2"
                    mb="$2"
                    fontSize="$md"
                    fontWeight={600}
                    color="$neutral12"
                  >
                    {locale.get("SETTING")}
                  </Text>

                  <Tab {...tabStyle}>{locale.get("SETTING_GENERAL")}</Tab>
                  <Tab {...tabStyle}>{locale.get("SETTING_GAME")}</Tab>
                  <Tab {...tabStyle}>Wine</Tab>
                  <Show when={sophon}>
                    <Tab {...tabStyle}>Downloader</Tab>
                  </Show>
                  <Show when={advanceSetting()}>
                    <Tab {...tabStyle}>{locale.get("SETTING_ADVANCED")}</Tab>
                  </Show>
                  <Tab {...tabStyle}>{locale.get("SETTING_LICENSES")}</Tab>

                  <Box mt="auto" pt="$4" pl="$2" pb="$2">
                    <IconButton
                      variant="subtle"
                      colorScheme="neutral"
                      aria-label="Toggle Color Mode"
                      onClick={() => {
                        const nextColorMode =
                          colorMode() === "light" ? "dark" : "light";
                        setKey("color_mode", nextColorMode);
                        toggleColorMode();
                      }}
                      icon={
                        colorMode() === "light" ? <IconMoon /> : <IconSun />
                      }
                      size="md"
                      borderRadius="$full"
                    />
                  </Box>
                </TabList>

                {/* General Tab */}
                <TabPanel flex={1} p={0} h="100%" bg="$neutral1">
                  <HStack spacing={0} h="100%" alignItems="flex-start">
                    <Box flex={1} h="100%" overflowY="auto" p="$8">
                      <VStack spacing="$6" alignItems="stretch" maxW="650px">
                        <Box {...cardStyle}>
                          <VStack spacing="$4" alignItems="stretch">
                            <GID />
                          </VStack>
                        </Box>
                        <Box {...cardStyle}>
                          <VStack spacing="$4" alignItems="stretch">
                            <MH />
                            <Divider />
                            <R />
                            <Divider />
                            <LC />
                          </VStack>
                        </Box>
                        <Box {...cardStyle}>
                          <VStack spacing="$4" alignItems="stretch">
                            <PRE />
                            <PRH />
                            <Text
                              userSelect="none"
                              size="xs"
                              color="$neutral10"
                            >
                              {locale.get("SETTING_PROXY_DESC")}
                            </Text>
                          </VStack>
                        </Box>
                        <Box {...cardStyle}>
                          <VStack spacing="$4" alignItems="stretch">
                            <UL />
                            <FormControl>
                              <FormLabel>
                                {locale.get("SETTING_YAAGL_VERSION")}
                              </FormLabel>
                              <Text
                                userSelect="none"
                                onClick={onClickVersion}
                                cursor="pointer"
                                color="$neutral11"
                                _hover={{ color: "$neutral12" }}
                              >
                                {CURRENT_YAAGL_VERSION}
                              </Text>
                            </FormControl>
                          </VStack>
                        </Box>
                      </VStack>
                    </Box>
                    <QuickActionsPanel />
                  </HStack>
                </TabPanel>

                {/* Game Tab */}
                <TabPanel flex={1} p={0} h="100%" bg="$neutral1">
                  <HStack spacing={0} h="100%" alignItems="flex-start">
                    <Box flex={1} h="100%" overflowY="auto" p="$8">
                      <Box {...cardStyle} maxW="650px">
                        <VStack spacing="$4" alignItems="stretch">
                          <ChannelClientConfig />
                          <MFR />
                          <Show when={supportsD3d12}>
                            <Divider />
                            <D3D12 />
                          </Show>
                        </VStack>
                      </Box>
                    </Box>
                    <QuickActionsPanel />
                  </HStack>
                </TabPanel>

                {/* Wine Tab */}
                <TabPanel flex={1} p={0} h="100%" bg="$neutral1">
                  <HStack spacing={0} h="100%" alignItems="flex-start">
                    <Box flex={1} h="100%" overflowY="auto" p="$8">
                      <Box {...cardStyle} maxW="650px">
                        <VStack spacing="$4" alignItems="stretch">
                          <WD />
                        </VStack>
                      </Box>
                    </Box>
                    <QuickActionsPanel />
                  </HStack>
                </TabPanel>

                <Show when={sophon}>
                  {game => (
                    <TabPanel
                      flex={1}
                      p="$8"
                      h="100%"
                      overflowY="auto"
                      bg="$neutral1"
                    >
                      <Box {...cardStyle} maxW="650px">
                        <SophonSettingsPanel game={game()} />
                      </Box>
                    </TabPanel>
                  )}
                </Show>

                {/* Advanced Tab */}
                <Show when={advanceSetting()}>
                  <TabPanel flex={1} p={0} h="100%" bg="$neutral1">
                    <HStack spacing={0} h="100%" alignItems="flex-start">
                      <Box flex={1} h="100%" overflowY="auto" p="$8">
                        <VStack spacing="$6" alignItems="stretch" maxW="650px">
                          <Alert
                            status="warning"
                            variant="left-accent"
                            borderRadius="$lg"
                          >
                            <AlertIcon mr="$2_5" />
                            {locale.get("SETTING_ADVANCED_ALERT")}
                          </Alert>
                          <Box {...cardStyle}>
                            <VStack spacing="$4" alignItems="stretch">
                              <FO />
                              <Divider />
                              <RS />
                            </VStack>
                          </Box>
                        </VStack>
                      </Box>
                      <QuickActionsPanel />
                    </HStack>
                  </TabPanel>
                </Show>

                {/* Licenses Tab - NO QUICK ACTIONS! */}
                <TabPanel
                  flex={1}
                  p="$8"
                  pt="$14"
                  h="100%"
                  overflowY="auto"
                  bg="$neutral1"
                >
                  <Box {...cardStyle}>
                    <VStack spacing="$4" alignItems="stretch">
                      <Heading level="3" size="base">
                        Copyright Notice: steam.exe and lsteamclient.dll (in the
                        sidecar folder)
                      </Heading>
                      <Text fontSize="$sm" color="$neutral11">
                        Copyright (c) 2015, 2019, 2020, 2021, 2022 Valve
                        Corporation
                      </Text>
                      <Text fontSize="$sm" color="$neutral11">
                        All rights reserved.
                      </Text>
                      <Text fontSize="$sm" color="$neutral11">
                        Redistribution and use in source and binary forms, with
                        or without modification, are permitted provided that the
                        following conditions are met:
                      </Text>
                      <Text fontSize="$sm" color="$neutral11">
                        1. Redistributions of source code must retain the above
                        copyright notice, this list of conditions and the
                        following disclaimer.
                      </Text>
                      <Text fontSize="$sm" color="$neutral11">
                        2. Redistributions in binary form must reproduce the
                        above copyright notice, this list of conditions and the
                        following disclaimer in the documentation and/or other
                        materials provided with the distribution.
                      </Text>
                      <Text fontSize="$sm" color="$neutral11">
                        3. Neither the name of the copyright holder nor the
                        names of its contributors may be used to endorse or
                        promote products derived from this software without
                        specific prior written permission.
                      </Text>
                      <Text fontSize="$sm" color="$neutral10" mt="$4">
                        THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
                        CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
                        WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
                        WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A
                        PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
                        COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY
                        DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
                        CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
                        PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
                        USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                        CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
                        CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
                        NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
                        USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
                        OF SUCH DAMAGE.
                      </Text>
                    </VStack>
                  </Box>
                </TabPanel>
              </Tabs>
            </HStack>
          </ModalBody>
        </ModalContent>
      );
    },
    config: config as Config, // FIXME: better method than type assertation?
  };
}

export async function createInitialSetupConfiguration({
  locale,
  defaultWineDistro,
}: {
  locale: Locale;
  defaultWineDistro: WineDistribution;
}) {
  const config: Partial<Config> = {};
  const versions = await getWineDistributions();
  const [selectedWineId, setSelectedWineId] = createSignal(
    versions.some(x => x.id === defaultWineDistro.id)
      ? defaultWineDistro.id
      : versions[0]?.id ?? defaultWineDistro.id
  );
  const selectedDistro = () =>
    versions.find(x => x.id === selectedWineId()) ?? defaultWineDistro;

  const channelClient = String(import.meta.env["YAAGL_CHANNEL_CLIENT"]);
  const supportsD3d12 = channelClient.startsWith("nap");

  const [D3D12] = await createD3D12({
    locale,
    config,
    supportsD3d12: () => selectedDistro().attributes.supportsD3d12 === true,
  });
  const [MFR] = await createMaxFrameRateConfig({ locale, config });
  const [MH] = await createMetalHUDConfig({ locale, config });
  const [R] = await createRetinaConfig({ locale, config });
  const [LC] = await createLeftCmdConfig({ locale, config });
  const [UL] = await createLocaleConfig({ locale, config });
  const [FO] = await createFPSUnlock({ locale, config });
  const [RS] = await createReShade({ locale, config });
  const [PRE] = await createProxyEnabledConfig({ locale, config });
  const [PRH] = await createProxyHostConfig({ locale, config });

  let GameConfigComponent: (() => JSXElement) | undefined;
  if (channelClient.startsWith("hk4e")) {
    const [W3] = await createWorkaround3Config({ locale, config });
    const [PO] = await createPatchOff({ locale, config });
    const [SP] = await createSteamPatch({ locale, config });
    const [BN] = await createBlockNet({ locale, config });
    const [HDR] = await createEnableHDRConfig({ locale, config });
    const [RES] = await createResolution({ locale, config });
    const [TF] = await createTimeoutFix({ locale, config });
    GameConfigComponent = () => (
      <>
        <HDR />
        <W3 />
        <PO />
        <SP />
        <BN />
        <RES />
        <TF />
      </>
    );
  } else if (channelClient.startsWith("nap")) {
    const [PO] = await createPatchOff({ locale, config });
    const [RES] = await createResolution({ locale, config });
    const [BN] = await createBlockNet({ locale, config });
    const [SP] = await createSteamPatch({ locale, config });
    const [TF] = await createTimeoutFix({ locale, config });
    GameConfigComponent = () => (
      <>
        <PO />
        <RES />
        <BN />
        <SP />
        <TF />
      </>
    );
  } else if (channelClient.startsWith("hkrpg")) {
    const [PO] = await createPatchOff({ locale, config });
    const [BN] = await createBlockNet({ locale, config });
    GameConfigComponent = () => (
      <>
        <PO />
        <BN />
      </>
    );
  }

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

  return function InitialSetupConfigurationUI(props: {
    onCancel: () => void;
    onConfirm: (distro: WineDistribution) => void;
  }) {
    const { colorMode, toggleColorMode } = useColorMode();

    const cardStyle = {
      bg: "$neutral2",
      borderWidth: "1px",
      borderColor: "$neutral5",
      borderRadius: 12,
      p: "$6",
      w: "100%",
      shadow: "$sm",
    };

    const sidebarStyle = {
      bg: "$neutral3",
      borderRightWidth: "1px",
      borderColor: "$neutral5",
      minW: "220px",
      p: "$4",
      pt: "$6",
      display: "flex",
      flexDirection: "column" as any,
    };

    const tabStyle = {
      justifyContent: "flex-start",
      borderRadius: "$lg",
      mb: "$2",
      px: "$4",
      py: "$2_5",
      fontSize: "$md",
      fontWeight: 500,
      color: "$neutral11",
      _selected: { bg: "$neutral6", color: "$neutral12", fontWeight: 600 },
      _hover: { bg: "$neutral5" },
      transition: "all 0.2s",
    };

    return (
      <ModalContent
        height={650}
        width={900}
        maxWidth={900}
        borderRadius={12}
        overflow="hidden"
        bg="$neutral1"
      >
        <ModalCloseButton zIndex={10} top="$4" right="$4" />
        <ModalBody
          p={0}
          h="100%"
          display="flex"
          style={{ "flex-direction": "column" }}
        >
          <Box flex={1} minH={0}>
            <Tabs orientation="vertical" h="100%" variant="pills">
              <TabList {...sidebarStyle}>
                <Text
                  px="$4"
                  py="$2"
                  mb="$2"
                  fontSize="$md"
                  fontWeight={600}
                  color="$neutral12"
                >
                  {locale.get("SETUP_CUSTOM")}
                </Text>

                <Tab {...tabStyle}>Wine</Tab>
                <Tab {...tabStyle}>{locale.get("SETTING_GENERAL")}</Tab>
                <Show when={GameConfigComponent}>
                  <Tab {...tabStyle}>{locale.get("SETTING_GAME")}</Tab>
                </Show>
                <Show when={advanceSetting()}>
                  <Tab {...tabStyle}>{locale.get("SETTING_ADVANCED")}</Tab>
                </Show>
                <Tab {...tabStyle}>{locale.get("SETTING_LICENSES")}</Tab>

                <Box mt="auto" pt="$4" pl="$2" pb="$2">
                  <IconButton
                    variant="subtle"
                    colorScheme="neutral"
                    aria-label="Toggle Color Mode"
                    onClick={() => {
                      const nextColorMode =
                        colorMode() === "light" ? "dark" : "light";
                      setKey("color_mode", nextColorMode);
                      toggleColorMode();
                    }}
                    icon={colorMode() === "light" ? <IconMoon /> : <IconSun />}
                    size="md"
                    borderRadius="$full"
                  />
                </Box>
              </TabList>

              {/* Wine Tab */}
              <TabPanel
                flex={1}
                p="$8"
                h="100%"
                overflowY="auto"
                bg="$neutral1"
              >
                <Box {...cardStyle} maxW="650px">
                  <VStack spacing="$4" alignItems="stretch">
                    <FormControl id="setupWineVersion">
                      <FormLabel>
                        {locale.get("SETTING_WINE_VERSION")}
                      </FormLabel>
                      <Select
                        value={selectedWineId()}
                        onChange={setSelectedWineId}
                      >
                        <SelectTrigger>
                          <SelectPlaceholder>
                            Choose an option
                          </SelectPlaceholder>
                          <SelectValue />
                          <SelectIcon />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectListbox>
                            <For each={versions}>
                              {item => (
                                <SelectOption value={item.id}>
                                  <SelectOptionText>
                                    {item.displayName}
                                  </SelectOptionText>
                                  <SelectOptionIndicator />
                                </SelectOption>
                              )}
                            </For>
                          </SelectListbox>
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </VStack>
                </Box>
              </TabPanel>

              {/* General Tab */}
              <TabPanel
                flex={1}
                p="$8"
                h="100%"
                overflowY="auto"
                bg="$neutral1"
              >
                <VStack spacing="$6" alignItems="stretch" maxW="650px">
                  <Box {...cardStyle}>
                    <VStack spacing="$4" alignItems="stretch">
                      <MH />
                      <Divider />
                      <R />
                      <Divider />
                      <LC />
                    </VStack>
                  </Box>
                  <Box {...cardStyle}>
                    <VStack spacing="$4" alignItems="stretch">
                      <PRE />
                      <PRH />
                      <Text userSelect="none" size="xs" color="$neutral10">
                        {locale.get("SETTING_PROXY_DESC")}
                      </Text>
                    </VStack>
                  </Box>
                  <Box {...cardStyle}>
                    <VStack spacing="$4" alignItems="stretch">
                      <UL />
                      <FormControl>
                        <FormLabel>
                          {locale.get("SETTING_YAAGL_VERSION")}
                        </FormLabel>
                        <Text
                          userSelect="none"
                          onClick={onClickVersion}
                          cursor="pointer"
                          color="$neutral11"
                          _hover={{ color: "$neutral12" }}
                        >
                          {CURRENT_YAAGL_VERSION}
                        </Text>
                      </FormControl>
                    </VStack>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Game Tab */}
              <Show when={GameConfigComponent}>
                {GameConfig => {
                  const GameItems = GameConfig();
                  return (
                    <TabPanel
                      flex={1}
                      p="$8"
                      h="100%"
                      overflowY="auto"
                      bg="$neutral1"
                    >
                      <Box {...cardStyle} maxW="650px">
                        <VStack spacing="$4" alignItems="stretch">
                          <GameItems />
                          <MFR />
                          <Show when={supportsD3d12}>
                            <Divider />
                            <D3D12 />
                          </Show>
                        </VStack>
                      </Box>
                    </TabPanel>
                  );
                }}
              </Show>

              {/* Advanced Tab */}
              <Show when={advanceSetting()}>
                <TabPanel
                  flex={1}
                  p="$8"
                  h="100%"
                  overflowY="auto"
                  bg="$neutral1"
                >
                  <VStack spacing="$6" alignItems="stretch" maxW="650px">
                    <Alert
                      status="warning"
                      variant="left-accent"
                      borderRadius="$lg"
                    >
                      <AlertIcon mr="$2_5" />
                      {locale.get("SETTING_ADVANCED_ALERT")}
                    </Alert>
                    <Box {...cardStyle}>
                      <VStack spacing="$4" alignItems="stretch">
                        <FO />
                        <Divider />
                        <RS />
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>
              </Show>

              {/* Licenses Tab */}
              <TabPanel
                flex={1}
                p="$8"
                pt="$14"
                h="100%"
                overflowY="auto"
                bg="$neutral1"
              >
                <Box {...cardStyle}>
                  <VStack spacing="$4" alignItems="stretch">
                    <Heading level="3" size="base">
                      Copyright Notice: steam.exe and lsteamclient.dll (in the
                      sidecar folder)
                    </Heading>
                    <Text fontSize="$sm" color="$neutral11">
                      Copyright (c) 2015, 2019, 2020, 2021, 2022 Valve
                      Corporation
                    </Text>
                    <Text fontSize="$sm" color="$neutral11">
                      All rights reserved.
                    </Text>
                    <Text fontSize="$sm" color="$neutral11">
                      Redistribution and use in source and binary forms, with or
                      without modification, are permitted provided that the
                      following conditions are met:
                    </Text>
                    <Text fontSize="$sm" color="$neutral11">
                      1. Redistributions of source code must retain the above
                      copyright notice, this list of conditions and the
                      following disclaimer.
                    </Text>
                    <Text fontSize="$sm" color="$neutral11">
                      2. Redistributions in binary form must reproduce the above
                      copyright notice, this list of conditions and the
                      following disclaimer in the documentation and/or other
                      materials provided with the distribution.
                    </Text>
                    <Text fontSize="$sm" color="$neutral11">
                      3. Neither the name of the copyright holder nor the names
                      of its contributors may be used to endorse or promote
                      products derived from this software without specific prior
                      written permission.
                    </Text>
                    <Text fontSize="$sm" color="$neutral10" mt="$4">
                      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
                      CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED
                      WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
                      WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
                      PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
                      HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
                      INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
                      (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
                      GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
                      BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
                      LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
                      (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT
                      OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
                      POSSIBILITY OF SUCH DAMAGE.
                    </Text>
                  </VStack>
                </Box>
              </TabPanel>
            </Tabs>
          </Box>
          <HStack
            justifyContent="flex-end"
            spacing="$3"
            px="$6"
            py="$4"
            borderTopWidth="1px"
            borderColor="$neutral5"
            bg="$neutral2"
          >
            <Button variant="ghost" onClick={props.onCancel}>
              {locale.get("SETTING_CANCEL")}
            </Button>
            <Button onClick={() => props.onConfirm(selectedDistro())}>
              {locale.get("SETUP_CONTINUE")}
            </Button>
          </HStack>
        </ModalBody>
      </ModalContent>
    );
  };
}

export type { Config };
