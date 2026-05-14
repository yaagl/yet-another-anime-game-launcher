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
import { getKey, setKey, _safeRelaunch, assertValueDefined } from "../utils";
import { Config } from "./config-def";

declare module "./config-def" {
  interface Config {
    fpsUnlock: "default" | "120" | "144";
  }
}

const CONFIG_KEY = "config_fps_unlock";

export default async function ({
  locale,
  config,
}: {
  locale: Locale;
  config: Partial<Config>;
}) {
  try {
    config.fpsUnlock = (await getKey(CONFIG_KEY)) as "default" | "120" | "144";
  } catch {
    config.fpsUnlock = "default"; // default value
  }

  const [value, setValue] = createSignal(config.fpsUnlock);

  async function onSave(apply: boolean) {
    assertValueDefined(config.fpsUnlock);
    if (!apply) {
      setValue(config.fpsUnlock);
      return;
    }
    if (config.fpsUnlock == value()) return;
    config.fpsUnlock = value();
    await setKey(CONFIG_KEY, config.fpsUnlock);
    return;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return [
        <FormControl>
          <FormLabel>{locale.get("SETTING_FPS_UNLOCK")}</FormLabel>
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
                      name: locale.get("SETTING_FPS_UNLOCK_DEFAULT"),
                      value: "default",
                    },
                    {
                      name: "120Hz",
                      value: "120",
                    },
                    {
                      name: "144Hz",
                      value: "144",
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
        </FormControl>,
      ];
    },
  ] as const;
}
