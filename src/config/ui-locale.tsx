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
} from "@hope-ui/solid";
import { createEffect, createSignal, For } from "solid-js";
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
    if (apply) locale.setLanguage(value());
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
              <SelectPlaceholder>
                {locale.get("SETTING_CHOOSE_OPTION")}
              </SelectPlaceholder>
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
      ];
    },
  ] as const;
}
