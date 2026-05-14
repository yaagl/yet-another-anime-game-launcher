import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    timeoutFix: boolean;
  }
}

const CONFIG_KEY = "config_timeout_fix";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.timeoutFix = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.timeoutFix = false; // default value
  }

  const [value, setValue] = createSignal(config.timeoutFix);

  async function onSave(apply: boolean) {
    assertValueDefined(config.timeoutFix);
    if (!apply) {
      setValue(config.timeoutFix);
      return NOOP;
    }
    if (config.timeoutFix == value()) return NOOP;
    config.timeoutFix = value();
    await setKey(CONFIG_KEY, config.timeoutFix ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="timeoutFix">
          <FormLabel>{locale.get("SETTING_TIMEOUT_FIX")}</FormLabel>
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
