import {
  Box,
  Button,
  Checkbox,
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
import { createSignal, For } from "solid-js";
import { getKey, setKey } from "./utils";

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

export async function createConfiguration() {
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
  return {
    UI: function (props: { onClose: () => void }) {
      const [currentConfig, setCurrentConfig] = createSignal(config);

      async function onSave() {
        // if(currentConfig().)
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
        props.onClose();
      }
      return (
        <ModalContent>
          <ModalHeader>设置</ModalHeader>
          <ModalBody ref={div}>
            <VStack spacing={"$4"}>
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
