import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    patchOff: boolean;
  }
}

const CONFIG_KEY = "config_patch_off";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.patchOff = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.patchOff = false; // default value
  }

  const [value, setValue] = createSignal(config.patchOff);

  async function onSave(apply: boolean) {
    assertValueDefined(config.patchOff);
    if (!apply) {
      setValue(config.patchOff);
      return NOOP;
    }
    if (config.patchOff == value()) return NOOP;
    config.patchOff = value();
    await setKey(CONFIG_KEY, config.patchOff ? "true" : "false");
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
          <FormLabel>{locale.get("SETTING_TURN_OFF_AC_PATCH")}</FormLabel>
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
