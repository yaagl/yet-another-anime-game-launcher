import {
  FormControl,
  FormLabel,
  Select,
  SelectTrigger,
  SelectPlaceholder,
  SelectValue,
  SelectIcon,
  SelectContent,
  SelectListbox,
  SelectOption,
  SelectOptionText,
  SelectOptionIndicator,
} from "@hope-ui/solid";
import { createEffect, createSignal, For } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";
import { exec, log } from "@utils";
import { getDisplayConfiguration } from "@utils";

declare module "./config-def" {
  interface Config {
    dpi: number;
  }
}

async function getOptimalDPI(defaultDPI = 96): Promise<number> {
  const dispConfig = await getDisplayConfiguration();
  await log(
    "Current display configuration:\n" + JSON.stringify(dispConfig, null, 2)
  );
  const hasExternal = dispConfig.displays.length != 1;
  try {
    const retinaEnabled =  (await getKey("config_retina")) == "true";
  } catch {
    const retinaEnabled =  false; // default value
  }

  if (!hasExternal) {
    try {
      const cmd_inch = `ioreg -l | awk -F\\" '/product-name/ {if (match($4, /[0-9]+-inch/)) {print substr($4, RSTART, RLENGTH-5)}}'`;
      const inch = parseInt(
        (await exec(["/bin/bash", "-c", cmd_inch], {}, false)).stdOut.toString()
      );
      if (inch < 10 || inch > 32) {
        await log(
          `Abnormal screen size of ${inch} inch detected.` +
            `Defaulting to 96DPI.`
        );
        return defaultDPI;
      }

      const res = dispConfig.displays[0].renderResolution;
      const dpi = Math.round(
        Math.sqrt(Math.pow(res[0], 2) + Math.pow(res[1], 2)) / inch
      );
      await log(
        `Screen size detected as ${inch} inch and resolution as ${res[0]}x${res[1]} with DPI ${dpi}`
      );
      return dpi;
    } catch (e) {
      await log("Error getting screen size: " + e);
    }
  }
  //TODO Default DPI settings for external monitor
  return defaultDPI;
}

export async function createDPIConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  const optimalDPI = await getOptimalDPI();

  try {
    config.dpi = parseInt(await getKey("config_dpi"));
  } catch {
    config.dpi = optimalDPI; // default value
  }

  const [value, setValue] = createSignal(config.dpi);
  const dpiPresets = [25, 50, 75, 100, 150, 200].map(item => {
    return {
      displayName:
        item.toString() +
        "%" +
        " is " +
        Math.round((optimalDPI * item) / 100).toString() +
        " DPI",
      dpi: Math.round((optimalDPI * item) / 100),
    };
  });

  async function onSave(apply: boolean) {
    assertValueDefined(config.dpi);
    if (!apply) {
      setValue(config.dpi);
      return NOOP;
    }
    if (config.dpi == value()) return NOOP;
    config.dpi = value();
    await setKey("config_dpi", config.dpi.toString());
    return NOOP;
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  return [
    function UI() {
      return [
        <FormControl id="dpi">
          <FormLabel>{locale.get("SETTING_DPI")}</FormLabel>
          <Select value={value()} onChange={setValue}>
            <SelectTrigger>
              <SelectPlaceholder>Choose an option</SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={[...dpiPresets]}>
                  {item => (
                    <SelectOption value={item.dpi}>
                      <SelectOptionText>{item.displayName}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </FormControl>,
      ];
    },
  ] as const;
}
