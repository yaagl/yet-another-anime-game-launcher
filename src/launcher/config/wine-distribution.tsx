import {
  Button,
  FormControl,
  FormLabel,
  Select,
  SelectContent,
  SelectIcon,
  SelectListbox,
  SelectOption,
  SelectOptionIndicator,
  SelectOptionText,
  SelectPlaceholder,
  SelectTrigger,
  SelectValue,
} from "@hope-ui/solid";
import { createSignal, For, Show } from "solid-js";
import { Locale } from "../../locale";
import { getKey, setKey, _safeRelaunch } from "../../utils";
import { WineVersionChecker } from "../../wine";
import { Config } from "./config-def";

declare module "./config-def" {
  interface Config {
    wineDistro: string;
  }
}

export async function createWineDistroConfig({
  locale,
  wineVersionChecker,
  config,
}: {
  locale: Locale;
  wineVersionChecker: WineVersionChecker;
  config: Partial<Config>;
}) {
  config.wineDistro = await getKey("wine_tag");

  const [value, setValue] = createSignal(config.wineDistro!);

  const [wineVersions, setwineVersions] = createSignal(
    [
      {
        tag: config.wineDistro!,
        url: "not_applicable",
      },
    ].filter((x) => x.tag !== "crossover")
  );
  (async () => {
    const versions = await wineVersionChecker.getAllReleases();
    if (versions.find((x) => x.tag === config.wineDistro!)) {
      setwineVersions(versions);
    } else {
      setwineVersions((x) => [...x, ...versions]);
    }
  })();

  async function applyChanges() {
    const tag = (config.wineDistro! = value());
    await locale.alert("RELAUNCH_REQUIRED", "RELAUNCH_REQUIRED_DESC");
    {
      await setKey("wine_state", "update");
      await setKey("wine_update_tag", tag);
      await setKey(
        "wine_update_url",
        wineVersions().find((x) => x.tag == tag)!.url
      );
      await _safeRelaunch();
    }
  }

  return [
    function UI() {
      return [
        <FormControl id="wineVersion">
          <FormLabel>{locale.get("SETTING_WINE_VERSION")}</FormLabel>
          <Select value={value()} onChange={setValue}>
            <SelectTrigger>
              <SelectPlaceholder>Choose an option</SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={[...wineVersions()]}>
                  {(item) => (
                    <SelectOption value={item.tag}>
                      <SelectOptionText>{item.tag}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </FormControl>,
        <Show when={value() != config.wineDistro}>
          <Button size="sm" colorScheme="danger" onClick={applyChanges}>{locale.get('SETTING_WINE_VERSION_CONFIRM')}</Button>
        </Show>,
      ];
    },
  ] as const;
}
