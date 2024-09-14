import { FormControl, FormLabel, Box, Checkbox } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getCPUInfo, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    workaround3: boolean;
  }
}

const CONFIG_KEY = "config_workaround3";

export async function createWorkaround3Config({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.workaround3 = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    const { model } = await getCPUInfo();
    config.workaround3 =
      import.meta.env["YAAGL_CHANNEL_CLIENT"] == "hk4eos"
        ? false
        : model.includes("Apple") // HACK: the app runs on rosetta
          ? true
          : false; // default value
  }

  const [value, setValue] = createSignal(config.workaround3);

  async function onSave(apply: boolean) {
    assertValueDefined(config.workaround3);
    if (!apply) {
      setValue(config.workaround3);
      return NOOP;
    }
    if (config.workaround3 == value()) return NOOP;
    config.workaround3 = value();
    await setKey(CONFIG_KEY, config.workaround3 ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="workaround3">
          <FormLabel>Workaround #3</FormLabel>
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
