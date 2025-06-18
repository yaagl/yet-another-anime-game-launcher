import { FormControl, FormLabel, Box, Checkbox, Input, InputGroup, InputAddon, InputLeftAddon, HStack, VStack } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";

declare module "@config/config-def" {
  interface Config {
    resolutionCustom: boolean;
    resolutionWidth: string;
    resolutionHeight: string;
  }
}

const CONFIG_KEY_CUSTOM = "config_resolution_custom";
const CONFIG_KEY_WIDTH = "config_resolution_width";
const CONFIG_KEY_HEIGHT = "config_resolution_height";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  const [Custom] = await createCustom({ locale, config });
  const [Width] = await createWidth({ locale, config });
  const [Height] = await createHeight({ locale, config });

  return [
    function UI() {
      return (
        <FormControl>
          <FormLabel>{locale.get("SETTING_CUSTOM_RESOLUTION")}</FormLabel>
          <VStack spacing={4} alignItems="stretch">
            <Box>
              <Custom />
            </Box>
            <HStack spacing={8}>
              <Width />
              <Height />
            </HStack>
          </VStack>
        </FormControl>
      );
    },
  ] as const;
}

async function createCustom({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.resolutionCustom = (await getKey(CONFIG_KEY_CUSTOM)) == "true";
  } catch {
    config.resolutionCustom = false; // default value
  }

  const [value, setValue] = createSignal(config.resolutionCustom);

  async function onSave(apply: boolean) {
    assertValueDefined(config.resolutionCustom);
    if (!apply) {
      setValue(config.resolutionCustom);
      return NOOP;
    }
    if (config.resolutionCustom == value()) return NOOP;
    config.resolutionCustom = value();
    await setKey(CONFIG_KEY_CUSTOM, config.resolutionCustom ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <Checkbox
          checked={value()}
          onChange={() => setValue(x => !x)}
          size="md"
        >
          {locale.get("SETTING_ENABLED")}
        </Checkbox>
      );
    },
  ] as const;
}

async function createWidth({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.resolutionWidth = await getKey(CONFIG_KEY_WIDTH);
  } catch {
    config.resolutionWidth = '1920'; // default value
  }

  const [value, setValue] = createSignal(config.resolutionWidth);

  async function onSave(apply: boolean) {
    assertValueDefined(config.resolutionWidth);
    if (!apply) {
      setValue(config.resolutionWidth);
      return NOOP;
    }
    if (config.resolutionWidth == value()) return NOOP;
    config.resolutionWidth = value();
    await setKey(CONFIG_KEY_WIDTH, config.resolutionWidth);
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <Input
          value={value()}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
      );
    },
  ] as const;
}

async function createHeight({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.resolutionHeight = await getKey(CONFIG_KEY_HEIGHT);
  } catch {
    config.resolutionHeight = '1920'; // default value
  }

  const [value, setValue] = createSignal(config.resolutionHeight);

  async function onSave(apply: boolean) {
    assertValueDefined(config.resolutionHeight);
    if (!apply) {
      setValue(config.resolutionHeight);
      return NOOP;
    }
    if (config.resolutionHeight == value()) return NOOP;
    config.resolutionHeight = value();
    await setKey(CONFIG_KEY_HEIGHT, config.resolutionHeight);
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <Input
          value={value()}
          onChange={(e) => setValue(e.currentTarget.value)}
        />
      );
    },
  ] as const;
}
