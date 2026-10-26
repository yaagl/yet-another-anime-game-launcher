import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    squircleDockIcon: boolean;
  }
}

export async function createSquircleDockIconConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.squircleDockIcon =
      (await getKey("config_squircle_dock_icon")) == "true";
  } catch {
    config.squircleDockIcon = true; // default value
  }

  const [value, setValue] = createSignal(config.squircleDockIcon);

  async function onSave(apply: boolean) {
    assertValueDefined(config.squircleDockIcon);
    if (!apply) {
      setValue(config.squircleDockIcon);
      return NOOP;
    }
    if (config.squircleDockIcon == value()) return NOOP;
    config.squircleDockIcon = value();
    await setKey(
      "config_squircle_dock_icon",
      config.squircleDockIcon ? "true" : "false"
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
        <FormControl id="squircleDockIcon">
          <FormLabel>{locale.get("SETTING_SQUIRCLE_DOCK_ICON")}</FormLabel>
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
