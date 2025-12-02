import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    blockNet: boolean;
  }
}

const CONFIG_KEY = "config_block_net";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.blockNet = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.blockNet = false; // default value
  }

  const [value, setValue] = createSignal(config.blockNet);

  async function onSave(apply: boolean) {
    assertValueDefined(config.blockNet);
    if (!apply) {
      setValue(config.blockNet);
      return NOOP;
    }
    if (config.blockNet == value()) return NOOP;
    config.blockNet = value();
    await setKey(CONFIG_KEY, config.blockNet ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="blockNet">
          <FormLabel>{locale.get("SETTING_BLOCK_NET")}</FormLabel>
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
