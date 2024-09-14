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
          community: x.attributes.community,
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
            community: x.attributes.community,
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
                  {item => (
                    <SelectOption value={item.tag}>
                      <SelectOptionText>{item.displayName}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </FormControl>,
        <Show when={value() != config.wineDistro}>
          <Button size="sm" colorScheme="danger" onClick={applyChanges}>
            {locale.get("SETTING_WINE_VERSION_CONFIRM")}
          </Button>
        </Show>,
      ];
    },
  ] as const;
}
