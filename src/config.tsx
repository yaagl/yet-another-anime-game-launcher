import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControl,
  FormLabel,
  HStack,
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
import { createSignal, For, onMount } from "solid-js";
import { alert, getKey, setKey, _safeRelaunch } from "./utils";
import { WineVersionChecker } from "./wine";

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
}: {
  wineVersionChecker: WineVersionChecker;
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
  const [currentConfig, setCurrentConfig] = createSignal({
    ...config,
    wine_tag: currentWineVersion,
  });
  const [wineVersions, setwineVersions] = createSignal([
    {
      tag: currentWineVersion,
      url: "not_applicable",
    },
  ]);
  return {
    UI: function (props: { onClose: () => void }) {
      onMount(async () => {
        const versions = await wineVersionChecker.getAllReleases();
        if (versions.find((x) => x.tag === currentWineVersion)) {
          setwineVersions(versions);
        } else {
          setwineVersions((x) => [...x, ...versions]);
        }
      });
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
          await alert("启动器需要重启", "需要重启以更新wine版本");
          // await setKey("")
          await setKey("wine_state", "update");
          const tag = currentConfig().wine_tag;
          await setKey("wine_update_tag", tag);
          await setKey(
            "wine_update_url",
            wineVersions().find((x) => x.tag == tag)!.url
          );
          await _safeRelaunch();
          return;
        }
        props.onClose();
      }
      return (
        <ModalContent>
          <ModalHeader>设置</ModalHeader>
          <ModalBody ref={div}>
            <VStack spacing={"$4"}>
              <FormControl id="wineVersion">
                <FormLabel>Wine 版本</FormLabel>
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
                      <For each={wineVersions()}>
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
              <FormControl id="dvxkAsync" mb="$4">
                <FormLabel>dxvk shader 异步编译模式 (推荐开启)</FormLabel>
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
                    启用
                  </Checkbox>
                </Box>
              </FormControl>
              <FormControl id="dxvkHud">
                <FormLabel>dxvk HUD</FormLabel>
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
                          { value: "", name: "不显示" },
                          { value: "fps", name: "只显示fps" },
                          { value: "full", name: "显示所有信息" },
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
                <FormLabel>Retina 模式</FormLabel>
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
                    启用
                  </Checkbox>
                </Box>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={"$4"}>
              <Button variant="outline" onClick={props.onClose}>
                取消
              </Button>
              <Button
                onClick={() => {
                  onSave();
                }}
              >
                保存
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      );
    },
    config,
  };
}
