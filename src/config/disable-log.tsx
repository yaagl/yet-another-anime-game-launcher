import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    disable_log: boolean;
  }
}

export async function createDisableLogConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.disable_log = (await getKey("config_disable_log")) == "true";
  } catch {
    config.disable_log = true; // default value
  }

  const [value, setValue] = createSignal(config.disable_log);

  async function onSave(apply: boolean) {
    assertValueDefined(config.disable_log);
    if (!apply) {
      setValue(config.disable_log);
      return NOOP;
    }
    if (config.disable_log == value()) return NOOP;
    config.disable_log = value();
    await setKey("config_disable_log", config.disable_log ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="disable_log">
          <FormLabel>{locale.get("SETTING_DISABLE_LOG")}</FormLabel>
          <Box>
            <Checkbox
              checked={value()}
              size="md"
              onChange={() => setValue(x => !x)}
            >
              {locale.get("SETTING_ENABLED")}
            </Checkbox>
          </Box>
        </FormControl>
      );
    },
  ] as const;
}
