import { zh_CN } from "./zh_CN";
import { en } from "./en";
import {
  alert as ualert,
  prompt as uprompt,
  formatString,
  getKey,
} from "../utils";

// https://stackoverflow.com/questions/67027081/how-to-assert-two-interfaces-contain-the-same-keys-in-typescript
type AssertKeysEqual<
  T1 extends Record<keyof T2, any>,
  T2 extends Record<keyof T1, any>
> = never;
type Assertion = AssertKeysEqual<typeof zh_CN, typeof en>;

export type LocaleTextKey = keyof typeof zh_CN;

export const locales = {
  zh_CN,
  en,
};

export async function createLocale() {
  let lang = "zh_CN";
  try {
    lang = await getKey("config_lang");
  } catch {
    lang = await Neutralino.os.getEnv("LANG");
    if (lang == "") {
      lang = "en";
    } else {
      lang = lang.split(".")[0];
    }
    // hacks
    if (lang.startsWith("en_")) {
      lang = "en";
    }
    // Traditional Chinese to be done
    // if(["zh-MO","zh-HK"].indexOf(lang)>=0) {
    //
    // }
  }
  let locale =
    lang in locales ? locales[lang as keyof typeof locales] : locales["en"];

  function alert(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    return ualert(locale[title], formatString(locale[content], intrp));
  }

  function prompt(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    return uprompt(locale[title], formatString(locale[content], intrp));
  }

  function format(key: LocaleTextKey, intrp: string[]) {
    return formatString(locale[key], intrp);
  }

  function get(key: LocaleTextKey) {
    return locale[key];
  }

  return {
    alert,
    prompt,
    format,
    get,
  };
}

export type Locale = ReturnType<typeof createLocale> extends Promise<infer C>
  ? C
  : never;
