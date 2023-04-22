import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    retina: boolean;
  }
}

export async function createRetinaConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.retina = (await getKey("config_retina")) == "true";
  } catch {
    config.retina = false; // default value
  }

  const [value, setValue] = createSignal(config.retina);

  async function onSave(apply: boolean) {
    assertValueDefined(config.retina);
    if (!apply) {
      setValue(config.retina);
      return NOOP;
    }
    if (config.retina == value()) return NOOP;
    config.retina = value();
    await setKey("config_retina", config.retina ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="retina">
          <FormLabel>{locale.get("SETTING_RETINA")}</FormLabel>
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
