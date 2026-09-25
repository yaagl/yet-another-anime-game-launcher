import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    debugLaunch: boolean;
  }
}

const CONFIG_KEY = "config_debug_launch";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.debugLaunch = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.debugLaunch = false;
  }

  const [value, setValue] = createSignal(config.debugLaunch);

  async function onSave(apply: boolean) {
    assertValueDefined(config.debugLaunch);
    if (!apply) {
      setValue(config.debugLaunch);
      return NOOP;
    }
    if (config.debugLaunch == value()) return NOOP;
    config.debugLaunch = value();
    await setKey(CONFIG_KEY, config.debugLaunch ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="debugLaunch">
          <FormLabel>{locale.get("SETTING_DEBUG_LAUNCH")}</FormLabel>
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
