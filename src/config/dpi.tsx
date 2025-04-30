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
  Button,
  HStack,
  Spacer,
} from "@hope-ui/solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Locale } from "@locale";
import { assertValueDefined, getKey, setKey } from "@utils";
import { Config, NOOP } from "./config-def";
import { exec, log } from "@utils";
import {
  getDisplayConfiguration,
  getDefaultDisplayScreenSize,
  Display,
} from "@utils";

const [resetDPISignal, setResetDPISignal] = createSignal(false);

declare module "./config-def" {
  interface Config {
    dpi: number;
  }
}

export async function externalResetDPI() {
  setResetDPISignal(true);
  await new Promise(resolve => setTimeout(resolve, 0));
  setResetDPISignal(false);
}

async function getOptimalDPI(
  defaultPhysicalDPI = 192,
  retinaCompensationFactor = 0.9
): Promise<number> {
  const dispConfig = await getDisplayConfiguration();
  await log(
    "Current display configuration:\n" + JSON.stringify(dispConfig, null, 2)
  );

  const hasExternal = dispConfig.displays.length != 1; // Assuming headless mode is not supported

  let retinaEnabled = false;
  try {
    retinaEnabled = (await getKey("config_retina")) == "true";
  } catch {
    retinaEnabled = false; // default value
  }

  let physicalDPI = defaultPhysicalDPI;
  let optimalDPI = physicalDPI;

  if (!hasExternal) {
    const display = dispConfig.displays[0];
    const inch = await getDefaultDisplayScreenSize();
    const res = display.physicalResolution;

    if (inch === undefined || res === undefined) {
      await log(
        `Failed to get screen size or resolution.` +
          `Assuming screen is ${defaultPhysicalDPI} DPI.`
      );
    } else if (inch < 10 || inch > 32) {
      await log(
        `Abnormal screen size of ${inch} inch detected.` +
          `Assuming screen is ${defaultPhysicalDPI} DPI.`
      );
    } else {
      await log(
        `Screen size detected as ${inch} inch and resolution as ${res[0]}x${res[1]}`
      );
      physicalDPI = Math.round(
        Math.sqrt(Math.pow(res[0], 2) + Math.pow(res[1], 2)) / inch
      );
    }

    if (retinaEnabled) {
      if (
        display.renderResolution == undefined ||
        display.physicalResolution == undefined
      ) {
        await log(
          `Failed to get screen resolution` +
            `Assuming retina resolution is equal to physical resolution.`
        );
        optimalDPI = physicalDPI;
      } else {
        optimalDPI = Math.round(
          (display.renderResolution[0] / display.physicalResolution[0]) *
            physicalDPI
        );
      }
      optimalDPI = Math.round(optimalDPI * retinaCompensationFactor); // fixme: for some reason, this is needed to match scale.
    } else {
      if (
        display.scaledResolution == undefined ||
        display.physicalResolution == undefined
      ) {
        await log(
          `Failed to get screen resolution` +
            `Assuming scaled resolution is half of physical resolution.`
        );
        optimalDPI = Math.round(physicalDPI / 2);
      } else {
        optimalDPI = Math.round(
          (display.scaledResolution[0] / display.physicalResolution[0]) *
            physicalDPI
        );
      }
    }

    return optimalDPI;
  } else {
    if (retinaEnabled) {
      return Math.round(physicalDPI);
    } else {
      return Math.round(physicalDPI / 2);
    }
  }
}

function getDPIPresets(optimalDPI: number) {
  return [25, 50, 75, 100, 150, 200].map(item => {
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
}

export async function createDPIConfig({
  locale,
  config,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  let optimalDPI = await getOptimalDPI();

  try {
    config.dpi = parseInt(await getKey("config_dpi"));
  } catch {
    config.dpi = optimalDPI; // default value
  }

  const [value, setValue] = createSignal(config.dpi);
  const [dpiPresets, setDpiPresets] = createSignal(getDPIPresets(optimalDPI));
  const [visible, setVisible] = createSignal(true);

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

  async function resetDPI() {
    optimalDPI = await getOptimalDPI();
    setDpiPresets(getDPIPresets(optimalDPI));
    setValue(optimalDPI);

    setVisible(false);
    await new Promise(resolve => setTimeout(resolve, 0)); // fixme: dirty approach to force re-render
    setVisible(true);

    log(JSON.stringify(dpiPresets()));

    await log(JSON.stringify(await Neutralino.window.getPosition()));
  }

  createEffect(() => {
    value();
    onSave(true);

    if (resetDPISignal()) {
      resetDPI();
    }
  });

  return [
    function UI() {
      return [
        <FormControl id="dpi">
          <FormLabel>{locale.get("SETTING_DPI")}</FormLabel>
          <HStack>
            <Show when={visible()}>
              <Select value={value()} onChange={setValue}>
                <SelectTrigger>
                  <SelectPlaceholder>Choose an option</SelectPlaceholder>
                  <SelectValue />
                  <SelectIcon />
                </SelectTrigger>
                <SelectContent>
                  <SelectListbox>
                    <For each={dpiPresets()}>
                      {item => (
                        <SelectOption value={item.dpi}>
                          <SelectOptionText>
                            {item.displayName}
                          </SelectOptionText>
                          <SelectOptionIndicator />
                        </SelectOption>
                      )}
                    </For>
                  </SelectListbox>
                </SelectContent>
              </Select>
              <Spacer px={5}></Spacer>
              <Button px={5} onClick={resetDPI}>
                Reset
              </Button>
            </Show>
          </HStack>
        </FormControl>,
      ];
    },
  ] as const;
}
