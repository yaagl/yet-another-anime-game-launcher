import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    metalHud: boolean;
  }
}

export async function createMetalHUDConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.metalHud = (await getKey("config_metalHud")) == "true";
  } catch {
    config.metalHud = false; // default value
  }

  const [value, setValue] = createSignal(config.metalHud);

  async function onSave(apply: boolean) {
    assertValueDefined(config.metalHud);
    if (!apply) {
      setValue(config.metalHud);
      return NOOP;
    }
    if (config.metalHud == value()) return NOOP;
    config.metalHud = value();
    await setKey("config_metalHud", config.metalHud ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="metalHud">
          <FormLabel>{locale.get("SETTING_MTL_HUD")}</FormLabel>
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
