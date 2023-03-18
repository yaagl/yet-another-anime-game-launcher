import { zh_CN } from "./zh_CN";
import { en } from "./en";
import { vi_VN } from "./vi_VN";
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
  zh_cn: zh_CN,
  en,
  vi_vn: vi_VN,
};

export async function createLocale() {
  let lang = "zh_cn";
  try {
    lang = (await getKey("config_lang")).toLowerCase();
  } catch {
    lang = navigator.language.replaceAll("-", "_").toLowerCase();
    if (lang == "") {
      lang = "en";
    } else {
      lang = lang.split(".")[0];
    }
    // hacks
    if (lang.startsWith("en_")) {
      lang = "en";
    }
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
