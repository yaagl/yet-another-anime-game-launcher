import {
  Box,
  Button,
  Checkbox,
  createIcon,
  Divider,
  FormControl,
  FormLabel,
  HStack,
  Input,
  InputGroup,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
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
  VStack,
} from "@hope-ui/solid";
import { createSignal, For } from "solid-js";
import { checkCrossover } from "../crossover";
import { Locale } from "../locale";
import { getKey, prompt, setKey, _safeRelaunch } from "../utils";
import { WineVersionChecker } from "../wine";

export interface LauncherConfiguration {
  dxvkAsync: boolean;
  dxvkHud: "" | "fps" | "full";
  retina: boolean;
}

const launcherDefaultOption: LauncherConfiguration = {
  dxvkAsync: true,
  retina: false,
  dxvkHud: "fps",
};

export async function createConfiguration({
  wineVersionChecker,
  locale,
}: {
  wineVersionChecker: WineVersionChecker;
  locale: Locale;
}) {
  let div: HTMLDivElement = null!;
  const config = { ...launcherDefaultOption };
  try {
    config.dxvkAsync = (await getKey("config_dxvkAsyc")) == "true";
  } catch {}
  try {
    config.dxvkHud = (await getKey("config_dxvkHud")) as any; // FIXME: assertation
  } catch {}
  try {
    config.retina = (await getKey("config_retina")) == "true";
  } catch {}

  const currentWineVersion = await getKey("wine_tag");
  const crossoverVersion = (await checkCrossover())
    ? [
        {
          tag: "crossover",
          url: "not_applicable",
        },
      ]
    : [];
  const [currentConfig, setCurrentConfig] = createSignal({
    ...config,
    wine_tag: currentWineVersion,
  });
  const [wineVersions, setwineVersions] = createSignal(
    [
      {
        tag: currentWineVersion,
        url: "not_applicable",
      },
    ].filter((x) => x.tag !== "crossover")
  );
  (async () => {
    const versions = await wineVersionChecker.getAllReleases();
    if (versions.find((x) => x.tag === currentWineVersion)) {
      setwineVersions(versions);
    } else {
      setwineVersions((x) => [...x, ...versions]);
    }
  })();

  const gameInstallDir = await getKey("game_install_dir");

  return {
    UI: function (props: {
      onClose: (action: "check-integrity" | "close") => void;
    }) {
      async function onSave() {
        if (config.dxvkAsync != currentConfig().dxvkAsync) {
          config.dxvkAsync = currentConfig().dxvkAsync;
          await setKey("config_dxvkAsyc", config.dxvkAsync ? "true" : "false");
        }
        if (config.dxvkHud != currentConfig().dxvkHud) {
          config.dxvkHud = currentConfig().dxvkHud;
          await setKey("config_dxvkHud", config.dxvkHud);
        }
        if (config.retina != currentConfig().retina) {
          config.retina = currentConfig().retina;
          await setKey("config_retina", config.retina ? "true" : "false");
        }
        if (currentWineVersion != currentConfig().wine_tag) {
          if (currentConfig().wine_tag == "crossover") {
            if (
              (await prompt(
                "CrossOver",
                `CrossOver自带的MoltenVK版本过低，无法正常运行。如果你没有手动更新过文件，请参考一下教程 https://github.com/3Shain/yet-another-anime-game-launcher/wiki/CrossOver%E6%A8%A1%E5%BC%8F%E4%BD%BF%E7%94%A8%E6%9C%80%E6%96%B0%E7%89%88MoltenVK
如果不确定要如何操作，你现在可以取消。
确认操作后启动器将重启`
              )) == true
            ) {
              await setKey("wine_state", "update");
              await setKey("wine_update_tag", "crossover");
              await setKey("wine_update_url", "");
              await _safeRelaunch();
            } else {
              setCurrentConfig((x) => {
                return { ...x, wine_tag: currentWineVersion };
              });
            }
          } else {
            await locale.alert("RELAUNCH_REQUIRED", "RELAUNCH_REQUIRED_DESC");
            // await setKey("")
            await setKey("wine_state", "update");
            const tag = currentConfig().wine_tag;
            await setKey("wine_update_tag", tag);
            await setKey(
              "wine_update_url",
              wineVersions().find((x) => x.tag == tag)!.url
            );
            await _safeRelaunch();
          }

          return;
        }
        props.onClose("close");
      }
      return (
        <ModalContent>
          <ModalHeader>{locale.get("SETTING")}</ModalHeader>
          <ModalBody ref={div}>
            <VStack spacing={"$4"}>
              <FormControl id="wineVersion">
                <FormLabel>{locale.get("SETTING_GAME_INSTALL_DIR")}</FormLabel>
                <InputGroup>
                  <Input disabled readOnly value={gameInstallDir} />
                  {/* <InputRightElement cursor={"pointer"} onClick={() => {}}>
                    <IconSetting boxSize="20px" color={"$blackAlpha9"} />
                  </InputRightElement> */}
                </InputGroup>
              </FormControl>
              <FormControl id="wineVersion">
                <FormLabel>{locale.get("SETTING_WINE_VERSION")}</FormLabel>
                <Select
                  value={currentConfig().wine_tag}
                  onChange={(value) =>
                    setCurrentConfig((x) => {
                      return { ...x, wine_tag: value };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectPlaceholder>Choose an option</SelectPlaceholder>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <For each={[...wineVersions(), ...crossoverVersion]}>
                        {(item) => (
                          <SelectOption value={item.tag}>
                            <SelectOptionText>{item.tag}</SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FormControl>
              <Divider />
              <FormControl id="dvxkAsync">
                <FormLabel>{locale.get("SETTING_ASYNC_DXVK")}</FormLabel>
                <Box>
                  <Checkbox
                    checked={currentConfig().dxvkAsync}
                    onChange={() =>
                      setCurrentConfig((x) => {
                        return { ...x, dxvkAsync: !x.dxvkAsync };
                      })
                    }
                    size="md"
                  >
                    {locale.get("SETTING_ENABLED")}
                  </Checkbox>
                </Box>
              </FormControl>
              <FormControl id="dxvkHud">
                <FormLabel>{locale.get("SETTING_DXVK_HUD")}</FormLabel>
                <Select
                  value={currentConfig().dxvkHud}
                  onChange={(value) =>
                    setCurrentConfig((x) => {
                      return { ...x, dxvkHud: value };
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectPlaceholder>Choose an option</SelectPlaceholder>
                    <SelectValue />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectListbox>
                      <For
                        each={[
                          {
                            value: "",
                            name: locale.get("SETTING_DXVK_HUD_NONE"),
                          },
                          {
                            value: "fps",
                            name: locale.get("SETTING_DXVK_HUD_FPS"),
                          },
                          {
                            value: "full",
                            name: locale.get("SETTING_DXVK_HUD_ALL"),
                          },
                        ]}
                      >
                        {(item) => (
                          <SelectOption value={item.value}>
                            <SelectOptionText>{item.name}</SelectOptionText>
                            <SelectOptionIndicator />
                          </SelectOption>
                        )}
                      </For>
                    </SelectListbox>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormControl id="retina">
                <FormLabel>{locale.get("SETTING_RETINA")}</FormLabel>
                <Box>
                  <Checkbox
                    checked={currentConfig().retina}
                    size="md"
                    onChange={() =>
                      setCurrentConfig((x) => {
                        return { ...x, retina: !x.retina };
                      })
                    }
                  >
                    {locale.get("SETTING_ENABLED")}
                  </Checkbox>
                </Box>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={"$4"}>
              <Button
                variant="outline"
                onClick={() => props.onClose("check-integrity")}
              >
                {locale.get("SETTING_CHECK_INTEGRITY")}
              </Button>
              <Button variant="outline" onClick={() => props.onClose("close")}>
                {locale.get("SETTING_CANCEL")}
              </Button>
              <Button
                onClick={() => {
                  onSave();
                }}
              >
                {locale.get("SETTING_SAVE")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      );
    },
    config,
  };
}

const IconSetting = createIcon({
  viewBox: "0 0 1024 1024",
  path() {
    return (
      <>
        <path
          fill="currentColor"
          d="M848 421.2c-16.6 0-30 13.4-30 30V770c0 38.6-31.4 70-70 70H272.1c-38.6 0-70-31.4-70-70V294.8c0-38.6 31.4-70 70-70h317.7c16.6 0 30-13.4 30-30s-13.4-30-30-30H272.1c-71.7 0-130.1 58.3-130.1 129.9v475.2c0 71.6 58.4 129.9 130.1 129.9h475.8c71.7 0 130.1-58.3 130.1-129.9V451.2c0-16.6-13.4-30-30-30z"
          p-id="2764"
        ></path>
        <path
          fill="currentColor"
          d="M443.7 572.5c11.7 11.7 30.8 11.7 42.4 0l383.4-383.4c11.7-11.7 11.7-30.8 0-42.4-11.7-11.7-30.8-11.7-42.4 0L443.7 530.1c-11.7 11.7-11.7 30.8 0 42.4z"
          p-id="2765"
        ></path>
      </>
    );
  },
});
