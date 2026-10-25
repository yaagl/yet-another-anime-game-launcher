import {
  Box,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  VStack,
} from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import { Locale } from "@locale";
import {
  assertValueDefined,
  getDisplayRefreshRate,
  getKey,
  setKey,
} from "@utils";
import { Config, NOOP } from "./config-def";

declare module "./config-def" {
  interface Config {
    maxFrameRateCustom: boolean;
    maxFrameRate: string;
  }
}

const CONFIG_KEY_CUSTOM = "config_monitor_refresh_rate_custom";
const CONFIG_KEY_VALUE = "config_monitor_refresh_rate_value";

export async function createMaxFrameRateConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  const defaultRefreshRate = String(await getDisplayRefreshRate());

  try {
    config.maxFrameRateCustom = (await getKey(CONFIG_KEY_CUSTOM)) == "true";
  } catch {
    config.maxFrameRateCustom = false;
  }

  try {
    config.maxFrameRate = await getKey(CONFIG_KEY_VALUE);
  } catch {
    config.maxFrameRate = defaultRefreshRate;
  }

  const [custom, setCustom] = createSignal(config.maxFrameRateCustom);
  const [value, setValue] = createSignal(config.maxFrameRate);

  async function onSaveCustom(apply: boolean) {
    assertValueDefined(config.maxFrameRateCustom);
    if (!apply) {
      setCustom(config.maxFrameRateCustom);
      return NOOP;
    }
    if (config.maxFrameRateCustom == custom()) return NOOP;
    config.maxFrameRateCustom = custom();
    await setKey(
      CONFIG_KEY_CUSTOM,
      config.maxFrameRateCustom ? "true" : "false"
    );
    return NOOP;
  }

  async function onSaveValue(apply: boolean) {
    assertValueDefined(config.maxFrameRate);
    if (!apply) {
      setValue(config.maxFrameRate);
      return NOOP;
    }
    if (config.maxFrameRate == value()) return NOOP;
    config.maxFrameRate = value();
    await setKey(CONFIG_KEY_VALUE, config.maxFrameRate);
    return NOOP;
  }

  createEffect(() => {
    custom();
    onSaveCustom(true);
  });

  createEffect(() => {
    value();
    onSaveValue(true);
  });

  return [
    function UI() {
      return (
        <FormControl>
          <FormLabel>{locale.get("SETTING_DXMT_MAX_FRAMERATE")}</FormLabel>
          <VStack spacing="$2" alignItems="stretch">
            <HStack spacing="$4">
              <Box>
                <Checkbox
                  checked={custom()}
                  onChange={() => setCustom(x => !x)}
                  size="md"
                >
                  {locale.get("SETTING_ENABLED")}
                </Checkbox>
              </Box>
              <Input
                type="number"
                min={0}
                step={1}
                disabled={!custom()}
                value={value()}
                onInput={e => setValue(e.currentTarget.value)}
                onChange={e => setValue(e.currentTarget.value)}
              />
            </HStack>
            <FormHelperText>
              {locale.get("SETTING_DXMT_MAX_FRAMERATE_DESC")}
            </FormHelperText>
          </VStack>
        </FormControl>
      );
    },
  ] as const;
}
