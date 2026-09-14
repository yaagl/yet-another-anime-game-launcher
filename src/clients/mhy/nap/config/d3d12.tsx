import { Box, Checkbox, FormControl } from "@hope-ui/solid";
import { createEffect, createSignal } from "solid-js";
import type { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { NOOP } from "@config/config-def";
import type { Config } from "@config/config-def";
import type { Wine } from "@wine";

declare module "@config/config-def" {
  interface Config {
    useD3D12: boolean;
  }
}

const CONFIG_KEY = "config_use_d3d12";

export async function createD3D12({
  locale,
  config,
  wine,
}: {
  locale: Locale;
  config: Partial<Config>;
  wine: Wine;
}) {
  try {
    config.useD3D12 = (await getKey(CONFIG_KEY)) == "true";
  } catch {
    config.useD3D12 = false;
  }

  const [value, setValue] = createSignal(config.useD3D12);

  async function onSave(apply: boolean) {
    assertValueDefined(config.useD3D12);
    if (!apply) {
      setValue(config.useD3D12);
      return NOOP;
    }
    if (config.useD3D12 == value()) return NOOP;
    config.useD3D12 = value();
    await setKey(CONFIG_KEY, config.useD3D12 ? "true" : "false");
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return (
        <FormControl id="d3d12">
          <Box>
            <Checkbox
              checked={value()}
              disabled={wine.attributes.supportsD3d12 !== true}
              onChange={() => setValue(x => !x)}
              size="md"
            >
              {locale.get("SETTING_D3D12")}
            </Checkbox>
          </Box>
        </FormControl>
      );
    },
  ] as const;
}
