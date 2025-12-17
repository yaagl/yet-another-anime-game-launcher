import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    steamPatch: boolean;
  }
}

const CONFIG_KEY = "config_steam_patch";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.steamPatch = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.steamPatch = false; // default value
  }

  const [value, setValue] = createSignal(config.steamPatch);

  async function onSave(apply: boolean) {
    assertValueDefined(config.steamPatch);
    if (!apply) {
      setValue(config.steamPatch);
      return NOOP;
    }
    if (config.steamPatch == value()) return NOOP;
    config.steamPatch = value();
    await setKey(CONFIG_KEY, config.steamPatch ? "true" : "false");
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
          <FormLabel>{locale.get("SETTING_TURN_ON_STEAM_PATCH")}</FormLabel>
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
