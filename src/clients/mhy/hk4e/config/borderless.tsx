import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    borderlessWindow: boolean;
  }
}

const CONFIG_KEY = "config_hk4e_borderless_window";

export async function createBorderlessWindowConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.borderlessWindow = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.borderlessWindow = true; // default to true
  }

  const [value, setValue] = createSignal(config.borderlessWindow);

  async function onSave(apply: boolean) {
    assertValueDefined(config.borderlessWindow);
    if (!apply) {
      setValue(config.borderlessWindow);
      return NOOP;
    }
    if (config.borderlessWindow == value()) return NOOP;
    config.borderlessWindow = value();
    await setKey(CONFIG_KEY, config.borderlessWindow ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="hk4eBorderlessWindow">
          <FormLabel>{locale.get("SETTING_BORDERLESS_WINDOW")}</FormLabel>
          <Box>
            <Checkbox
              checked={value()}
              onChange={() => setValue(x => !x)}
              size="md"
            >
              {locale.get("SETTING_ENABLED")}
            </Checkbox>
          </Box>
        </FormControl>
      );
    },
  ] as const;
}
