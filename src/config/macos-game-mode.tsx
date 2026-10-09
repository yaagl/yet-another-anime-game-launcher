import { FormControl, FormLabel, Box, Checkbox, Text } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    macosGameMode: boolean;
  }
}

const CONFIG_KEY = "config_macos_game_mode";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.macosGameMode = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.macosGameMode = false; // default value
  }

  const [value, setValue] = createSignal(config.macosGameMode);

  async function onSave(apply: boolean) {
    assertValueDefined(config.macosGameMode);
    if (!apply) {
      setValue(config.macosGameMode);
      return NOOP;
    }
    if (config.macosGameMode == value()) return NOOP;
    config.macosGameMode = value();
    await setKey(CONFIG_KEY, config.macosGameMode ? "true" : "false");
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
          <FormLabel>{locale.get("SETTING_MACOS_GAME_MODE")}</FormLabel>
          <Box>
            <Checkbox
              checked={value()}
              onChange={() => setValue(x => !x)}
              size="md"
            >
              {locale.get("SETTING_ENABLED")}
            </Checkbox>
          </Box>
          <Text userSelect="none" size="xs" color="$neutral10" mt="$2">
            {locale.get("SETTING_MACOS_GAME_MODE_DESC")}
          </Text>
        </FormControl>
      );
    },
  ] as const;
}
