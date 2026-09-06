import {
  FormControl,
  FormLabel,
  Box,
  Checkbox,
  Input,
  InputGroup,
} from "@hope-ui/solid";
import { createEffect, createSignal, Show } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "@config/config-def";
import { DEFAULT_BLOCK_NET_DURATION } from "@constants";

declare module "@config/config-def" {
  interface Config {
    blockNet: boolean;
    blockNetDuration: number;
  }
}

const CONFIG_KEY = "config_block_net";
const CONFIG_DURATION_KEY = "config_block_net_duration";

export default async function ({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  try {
    config.blockNet = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.blockNet = false; // default value
  }

  try {
    const d = await getKey(CONFIG_DURATION_KEY);
    config.blockNetDuration = d ? parseInt(d, 10) : DEFAULT_BLOCK_NET_DURATION;
  } catch {
    config.blockNetDuration = DEFAULT_BLOCK_NET_DURATION;
  }

  const [value, setValue] = createSignal(config.blockNet);
  const [duration, setDuration] = createSignal(
    config.blockNetDuration || DEFAULT_BLOCK_NET_DURATION
  );

  async function onSave(apply: boolean) {
    assertValueDefined(config.blockNet);
    if (!apply) {
      setValue(config.blockNet);
      setDuration(config.blockNetDuration || DEFAULT_BLOCK_NET_DURATION);
      return NOOP;
    }
    config.blockNet = value();
    config.blockNetDuration = duration();
    await setKey(CONFIG_KEY, config.blockNet ? "true" : "false");
    await setKey(CONFIG_DURATION_KEY, String(config.blockNetDuration));
    return NOOP;
  }

  createEffect(() => {
    value();
    duration();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="blockNet">
          <FormLabel>{locale.get("SETTING_BLOCK_NET")}</FormLabel>
          <Box>
            <Checkbox
              checked={value()}
              onChange={() => setValue(x => !x)}
              size="md"
            >
              {locale.get("SETTING_ENABLED")}
            </Checkbox>
          </Box>
          <Show when={value()}>
            <Box mt="$2">
              <FormLabel fontSize="$sm">Delay (seconds)</FormLabel>
              <InputGroup>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={duration()}
                  onChange={e =>
                    setDuration(
                      parseInt(e.target.value, 10) || DEFAULT_BLOCK_NET_DURATION
                    )
                  }
                />
              </InputGroup>
            </Box>
          </Show>
        </FormControl>
      );
    },
  ] as const;
}

