import {
  Button,
  FormControl,
  FormLabel,
  Select,
} from "../components/ui";
import { createSignal, For, Show } from "solid-js";
import { Locale } from "../locale";
import { getKey, setKey, _safeRelaunch, assertValueDefined } from "../utils";
import { Config } from "./config-def";
import { getWineDistributions } from "@wine";

declare module "./config-def" {
  interface Config {
    wineDistro: string;
  }
}

export async function createWineDistroConfig({
  locale,
  config,
}: {
  locale: Locale;
  config: Partial<Config>;
}) {
  config.wineDistro = await getKey("wine_tag");

  const versions = await getWineDistributions();

  assertValueDefined(config.wineDistro);
  const [value, setValue] = createSignal(config.wineDistro);

  const [wineVersions] = createSignal<
    {
      tag: string;
      url: string;
      displayName: string;
      community?: boolean;
    }[]
  >(
    (() => {
      if (versions.find(x => x.id === config.wineDistro)) {
        return versions.map(x => ({
          tag: x.id,
          url: x.remoteUrl,
          displayName: x.displayName,
        }));
      } else {
        return [
          {
            tag: config.wineDistro,
            url: "not_applicable",
            displayName: config.wineDistro,
          },
          ...versions.map(x => ({
            tag: x.id,
            url: x.remoteUrl,
            displayName: x.displayName,
          })),
        ];
      }
    })()
  );

  async function applyChanges() {
    const tag = (config.wineDistro = value());
    const distro = wineVersions().find(x => x.tag === tag);
    if (!distro) return;
    // If Community Version is selected, a warning message pops up
    if (distro.community) {
      await locale.alert("COMMUNITY_WARNING", "COMMUNITY_WINE_ALERT");
    }
    await locale.alert("RELAUNCH_REQUIRED", "RELAUNCH_REQUIRED_DESC");
    {
      await setKey("wine_state", "update");
      await setKey("wine_update_tag", tag);
      await setKey("wine_update_url", distro.url);
      await _safeRelaunch();
    }
  }

  return [
    function UI() {
      const options = wineVersions().map(item => ({
        value: item.tag,
        label: item.displayName,
      }));
      
      return [
        <FormControl id="wineVersion">
          <FormLabel>{locale.get("SETTING_WINE_VERSION")}</FormLabel>
          <Select
            value={value()}
            onChange={setValue}
            options={options}
            itemComponent={props => (
              <Select.Item item={props.item} class="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-primary-50 ui-highlighted:bg-primary-100 rounded">
                <Select.ItemLabel>{options.find(opt => opt.value === props.item.rawValue)?.label}</Select.ItemLabel>
                <Select.ItemIndicator class="inline-flex items-center">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </Select.ItemIndicator>
              </Select.Item>
            )}
          >
            <Select.Trigger class="flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white hover:border-primary-500 focus:outline-none focus:border-primary-500 w-full">
              <Select.Value<string>>
                {state => options.find(opt => opt.value === state.selectedOption())?.label}
              </Select.Value>
              <Select.Icon class="ml-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content class="bg-white border-2 border-gray-300 rounded shadow-lg mt-1 max-h-60 overflow-auto z-50">
                <Select.Listbox class="p-1" />
              </Select.Content>
            </Select.Portal>
          </Select>
        </FormControl>,
        <Show when={value() != config.wineDistro}>
          <Button size="sm" variant="contained" onClick={applyChanges}>
            {locale.get("SETTING_WINE_VERSION_CONFIRM")}
          </Button>
        </Show>,
      ];
    },
  ] as const;
}
