import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    gameControllerFix: boolean;
  }
}

export async function createGameControllerFixConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.gameControllerFix =
      (await getKey("config_game_controller_fix")) == "true";
  } catch {
    config.gameControllerFix = false; // default value
  }

  const [value, setValue] = createSignal(config.gameControllerFix);

  async function onSave(apply: boolean) {
    assertValueDefined(config.gameControllerFix);
    if (!apply) {
      setValue(config.gameControllerFix);
      return NOOP;
    }
    if (config.gameControllerFix == value()) return NOOP;
    config.gameControllerFix = value();
    await setKey(
      "config_game_controller_fix",
      config.gameControllerFix ? "true" : "false"
    );
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="gameControllerFix">
          <FormLabel>{locale.get("SETTING_GAME_CONTROLLER_FIX")}</FormLabel>
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
