import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "../locale";
import { assertValueDefined, getKey, setKey } from "../utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    dxvkAsync: boolean;
  }
}

export async function createDxvkAsyncConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.dxvkAsync = (await getKey("config_dxvkAsync")) == "true";
  } catch {
    config.dxvkAsync = true; // default value
  }

  const [value, setValue] = createSignal(config.dxvkAsync);

  async function onSave(apply: boolean) {
    assertValueDefined(config.dxvkAsync);
    if (!apply) {
      setValue(config.dxvkAsync);
      return NOOP;
    }
    if (config.dxvkAsync == value()) return NOOP;
    config.dxvkAsync = value();
    await setKey("config_dxvkAsync", config.dxvkAsync ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="dvxkAsync">
          <FormLabel>{locale.get("SETTING_ASYNC_DXVK")}</FormLabel>
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
