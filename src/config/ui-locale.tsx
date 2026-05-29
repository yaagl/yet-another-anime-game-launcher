import {
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
  Text,
} from "@hope-ui/solid";
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

  return [
    function UI() {
      return [
        <FormControl id="uiLOCALE">
          <FormLabel>{locale.get("SETTING_UI_LOCALE")}</FormLabel>
          <Select value={value()} onChange={setValue}>
            <SelectTrigger>
              <SelectPlaceholder>Choose an option</SelectPlaceholder>
              <SelectValue />
              <SelectIcon />
            </SelectTrigger>
            <SelectContent>
              <SelectListbox>
                <For each={locale.supportedLanguages}>
                  {item => (
                    <SelectOption value={item.id}>
                      <SelectOptionText>{item.name}</SelectOptionText>
                      <SelectOptionIndicator />
                    </SelectOption>
                  )}
                </For>
              </SelectListbox>
            </SelectContent>
          </Select>
        </FormControl>,
        <Show when={locale.currentLanguage != value()}>
          <Text fontSize={11} color={"$blackAlpha8"}>
            {locale.get("SETTING_RESTART_TO_TAKE_EFFECT")}
          </Text>
        </Show>,
      ];
    },
  ] as const;
}
