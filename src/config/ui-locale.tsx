import {
  FormControl,
  FormLabel,
  Select,
  Text,
} from "../components/ui";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Locale } from "@locale";
import { setKey } from "@utils";
import { Config } from "./config-def";

export default async function ({
  locale,
}: {
  config: Partial<Config>;
  locale: Locale;
}) {
  const [value, setValue] = createSignal(locale.currentLanguage);

  async function onSave(apply: boolean) {
    await setKey("config_uiLocale", value());
  }

  createEffect(() => {
    value();
    onSave(true);
  });

  const options = locale.supportedLanguages.map(item => ({
    value: item.id,
    label: item.name,
  }));

  return [
    function UI() {
      return [
        <FormControl id="uiLOCALE">
          <FormLabel>{locale.get("SETTING_UI_LOCALE")}</FormLabel>
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
        <Show when={locale.currentLanguage != value()}>
          <Text class="text-xs text-gray-400">
            {locale.get("SETTING_RESTART_TO_TAKE_EFFECT")}
          </Text>
        </Show>,
      ];
    },
  ] as const;
}
