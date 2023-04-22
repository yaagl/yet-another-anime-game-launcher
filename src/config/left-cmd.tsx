import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    leftCmd: boolean;
  }
}

export async function createLeftCmdConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.leftCmd = (await getKey("left_cmd")) == "true";
  } catch {
    config.leftCmd = false; // default value
  }

  const [value, setValue] = createSignal(config.leftCmd);

  async function onSave(apply: boolean) {
    assertValueDefined(config.leftCmd);
    if (!apply) {
      setValue(config.leftCmd);
      return NOOP;
    }
    if (config.leftCmd == value()) return NOOP;
    config.leftCmd = value();
    await setKey("left_cmd", config.leftCmd ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="leftCmd">
          <FormLabel>{locale.get("SETTING_LEFT_CMD")}</FormLabel>
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
