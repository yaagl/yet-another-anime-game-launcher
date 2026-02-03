import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Tabs,
  Text,
  VStack,
  notificationService,
} from "../components/ui";
import { CURRENT_YAAGL_VERSION, YAAGL_ADVANCED_ENABLE } from "../constants";
import { Locale } from "../locale";
import { Wine } from "../wine";
import { Config } from "./config-def";
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
import { createProxyEnabledConfig } from "@config/proxy-enabled";
import { createProxyHostConfig } from "@config/proxy-host";

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
    config: Partial<Config>
  ) => Promise<() => JSXElement>;
}) {
  const config: Partial<Config> = {};
  const [WD] = await createWineDistroConfig({
    locale,
    config,
  });
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
      return (
        <div class="bg-white rounded-lg shadow-xl" style={{ height: "570px", width: "1000px", "max-width": "1000px" }}>
          <div class="p-6">
            <div class="flex justify-between items-center mb-4">
              <Heading size="lg">{locale.get("SETTING")}</Heading>
              <button 
                onClick={() => props.onClose("close")}
                class="text-gray-400 hover:text-gray-600"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Tabs orientation="vertical" class="h-full">
              <Tabs.List class="flex flex-col min-w-[120px] border-r border-gray-200">
                <Tabs.Trigger value="general" class="px-4 py-2 text-left hover:bg-gray-100 ui-selected:bg-primary-100 ui-selected:border-l-4 ui-selected:border-primary-600">{locale.get("SETTING_GENERAL")}</Tabs.Trigger>
                <Tabs.Trigger value="game" class="px-4 py-2 text-left hover:bg-gray-100 ui-selected:bg-primary-100 ui-selected:border-l-4 ui-selected:border-primary-600">{locale.get("SETTING_GAME")}</Tabs.Trigger>
                <Tabs.Trigger value="wine" class="px-4 py-2 text-left hover:bg-gray-100 ui-selected:bg-primary-100 ui-selected:border-l-4 ui-selected:border-primary-600">Wine</Tabs.Trigger>
                <Show when={advanceSetting()}>
                  <Tabs.Trigger value="advanced" class="px-4 py-2 text-left hover:bg-gray-100 ui-selected:bg-primary-100 ui-selected:border-l-4 ui-selected:border-primary-600">{locale.get("SETTING_ADVANCED")}</Tabs.Trigger>
                </Show>
                <Tabs.Trigger value="licenses" class="px-4 py-2 text-left hover:bg-gray-100 ui-selected:bg-primary-100 ui-selected:border-l-4 ui-selected:border-primary-600">{locale.get("SETTING_LICENSES")}</Tabs.Trigger>
              </Tabs.List>
              <Tabs.Content value="general" class="flex-1 p-0">
                <div class="flex gap-4 h-full">
                  <div class="w-[40%] overflow-y-scroll pr-4" style="align-self: stretch">
                    <VStack spacing={"$4"}>
                      <GID />
                      <Divider />
                      <MH />
                      <R />
                      <LC />
                      <Divider />
                      <PRE />
                      <PRH />                      <p class="text-xs select-none">
                        {locale.get("SETTING_PROXY_DESC")}
                      </p>
                      <Divider />
                      <UL />
                      <FormControl>
                        <FormLabel>
                          {locale.get("SETTING_YAAGL_VERSION")}
                        </FormLabel>
                        <p class="select-none cursor-pointer" onClick={onClickVersion}>
                          {CURRENT_YAAGL_VERSION}
                        </p>
                      </FormControl>
                    </VStack>
                  </div>
                  <div class="flex-1" />
                  <div class="flex flex-col gap-1 w-[30%]" style="align-items: start; align-self: start">
                    <Heading level="1" ml={12} mb={"$4"}>
                      {locale.get("SETTING_QUICK_ACTIONS")}
                    </Heading>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={() => props.onClose("check-integrity")}
                    >
                      {locale.get("SETTING_CHECK_INTEGRITY")}
                    </Button>
                    <Divider />
                    <Button
                      variant="text"
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
                      variant="text"
                      size="sm"
                      onClick={() =>
                        exec2(
                          ["open", gameInstallDir()],
                          {},
                          false,
                          "/dev/null"
                        )
                      }
                    >
                      {locale.get("SETTING_OPEN_GAME_INSTALL_DIR")}
                    </Button>
                    <Button
                      variant="text"
                      size="sm"
                      onClick={async () =>
                        await exec2(
                          ["open", resolve("./")],
                          {},
                          false,
                          "/dev/null"
                        )
                      }
                    >
                      {locale.get("SETTING_OPEN_YAAGL_DIR")}
                    </Button>
                  </div>
                </div>
              </Tabs.Content>
              <Tabs.Content value="game" class="flex-1 p-0 h-full">
                <VStack spacing={"$4"} w="40%" alignItems="start">
                  <ChannelClientConfig />
                </VStack>
              </Tabs.Content>
              <Tabs.Content value="wine" class="flex-1 p-0 h-full">
                <VStack spacing={"$4"} w="40%" alignItems="start">
                  <WD />
                </VStack>
              </Tabs.Content>
              <Show when={advanceSetting()}>
                <Tabs.Content value="advanced" class="flex-1 p-0 h-full">
                  <VStack spacing={"$4"} w="40%" alignItems="start">
                    <Alert class="p-3 rounded border-l-4 bg-yellow-100 text-yellow-800 border-yellow-500">
                      {locale.get("SETTING_ADVANCED_ALERT")}
                    </Alert>
                    <FO />
                    <RS />
                  </VStack>
                </Tabs.Content>
              </Show>
              <Tabs.Content value="licenses" class="flex-1 p-0 h-full">
                <VStack spacing={"$4"} w="100%" alignItems="start">
                  <Heading>
                    Copyright Notice: steam.exe and lsteamclient.dll (in the
                    sidecar folder)
                  </Heading>
                  <Text>
                    Copyright (c) 2015, 2019, 2020, 2021, 2022 Valve Corporation
                  </Text>
                  <Text>All rights reserved.</Text>
                  <Text>
                    Redistribution and use in source and binary forms, with or
                    without modification, are permitted provided that the
                    following conditions are met:
                  </Text>

                  <Text>
                    1. Redistributions of source code must retain the above
                    copyright notice, this list of conditions and the following
                    disclaimer.
                  </Text>

                  <Text>
                    2. Redistributions in binary form must reproduce the above
                    copyright notice, this list of conditions and the following
                    disclaimer in the documentation and/or other materials
                    provided with the distribution.
                  </Text>

                  <Text>
                    3. Neither the name of the copyright holder nor the names of
                    its contributors may be used to endorse or promote products
                    derived from this software without specific prior written
                    permission.
                  </Text>

                  <Text>
                    THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND
                    CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES,
                    INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
                    MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
                    DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR
                    CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
                    SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
                    NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
                    LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
                    HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
                    CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
                    OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
                    SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
                  </Text>
                </VStack>
              </Tabs.Content>
            </Tabs>
          </div>
        </div>
      );
    },
    config: config as Config, // FIXME: better method than type assertation?
  };
}

export type { Config };
