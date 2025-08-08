import { Box, Checkbox, FormControl, FormLabel } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "../locale";
import { Config, NOOP } from "./config-def";
import { assertValueDefined, getKey, setKey } from "@utils";

declare module "./config-def" {
  interface Config {
    proxyEnabled: boolean;
  }
}

export async function createProxyEnabledConfig({
  config,
  locale,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.proxyEnabled = (await getKey("config_proxyEnabled")) == "true";
  } catch {
    config.proxyEnabled = false; // default value
  }

  const [value, setValue] = createSignal(config.proxyEnabled);

  async function onSave(apply: boolean) {
    assertValueDefined(config.proxyEnabled);
    if (!apply) {
      setValue(config.proxyEnabled);
      return NOOP;
    }
    if (config.proxyEnabled == value()) return NOOP;
    config.proxyEnabled = value();
    await setKey("config_proxyEnabled", config.proxyEnabled ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="proxyEnabled">
          <FormLabel>{locale.get("SETTING_PROXY_ENABLED")}</FormLabel>
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
