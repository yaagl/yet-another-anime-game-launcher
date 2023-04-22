import {
  FormControl,
  FormLabel,
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
} from "@hope-ui/solid";
import { createEffect, createSignal, For } from "solid-js";
import { Locale } from "../locale";
import { assertValueDefined, getKey, setKey } from "../utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    dxvkHud: "" | "fps" | "all";
  }
}

export async function createDxvkHUDConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.dxvkHud = (await getKey("config_dxvkHud")) as Config["dxvkHud"];
  } catch {
    config.dxvkHud = "fps"; // default value
  }

  const [value, setValue] = createSignal(config.dxvkHud);

  async function onSave(apply: boolean) {
    assertValueDefined(config.dxvkHud);
    if (!apply) {
      setValue(config.dxvkHud);
      return NOOP;
    }
    if (config.dxvkHud == value()) return NOOP;
    config.dxvkHud = value();
    await setKey("config_dxvkHud", config.dxvkHud);
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="dxvkHud">
          <FormLabel>{locale.get("SETTING_DXVK_HUD")}</FormLabel>
          <Select value={value()} onChange={setValue}>
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
                  {item => (
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
      );
    },
  ] as const;
}
