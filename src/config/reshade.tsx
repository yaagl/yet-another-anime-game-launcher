import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    reshade: boolean;
  }
}

const CONFIG_KEY = "config_reshade";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.reshade = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.reshade = false; // default value
  }

  const [value, setValue] = createSignal(config.reshade);

  async function onSave(apply: boolean) {
    assertValueDefined(config.reshade);
    if (!apply) {
      setValue(config.reshade);
      return NOOP;
    }
    if (config.reshade == value()) return NOOP;
    config.reshade = value();
    await setKey(CONFIG_KEY, config.reshade ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl>
          <FormLabel>ReShade</FormLabel>
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
