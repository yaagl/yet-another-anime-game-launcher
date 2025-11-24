import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    hk4eEnableHDR: boolean;
  }
}

const CONFIG_KEY = "config_hk4e_enable_hdr";

export async function createEnableHDRConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.hk4eEnableHDR = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.hk4eEnableHDR = false;
  }

  const [value, setValue] = createSignal(config.hk4eEnableHDR);

  async function onSave(apply: boolean) {
    assertValueDefined(config.hk4eEnableHDR);
    if (!apply) {
      setValue(config.hk4eEnableHDR);
      return NOOP;
    }
    if (config.hk4eEnableHDR == value()) return NOOP;
    config.hk4eEnableHDR = value();
    await setKey(CONFIG_KEY, config.hk4eEnableHDR ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="hk4eEnableHDR">
          <FormLabel>{locale.get("SETTING_ENABLE_HDR")}</FormLabel>
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
