import { Box, Checkbox, FormControl, FormLabel } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "../locale";
import { Config, NOOP } from "./config-def";
import { assertValueDefined, getKey, setKey } from "@utils";

declare module "./config-def" {
  interface Config {
    disableUpdateNotices: boolean;
  }
}

export const CONFIG_KEY = "config_disableUpdateNotices";

export async function createDisableUpdateNoticesConfig({
  config,
  locale,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.disableUpdateNotices = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.disableUpdateNotices = false;
  }

  const [value, setValue] = createSignal(config.disableUpdateNotices);

  async function onSave(apply: boolean) {
    assertValueDefined(config.disableUpdateNotices);
    if (!apply) {
      setValue(config.disableUpdateNotices);
      return NOOP;
    }
    if (config.disableUpdateNotices == value()) return NOOP;
    config.disableUpdateNotices = value();
    await setKey(CONFIG_KEY, config.disableUpdateNotices ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="disableUpdateNotices">
          <FormLabel>{locale.get("SETTING_DISABLE_UPDATE_NOTICES")}</FormLabel>
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
