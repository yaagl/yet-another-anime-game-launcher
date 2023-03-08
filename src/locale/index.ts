import zh_CN from "./zh_CN";
import en from "./en";
import { alert as ualert, prompt as uprompt ,formatString } from "../utils";

// https://stackoverflow.com/questions/67027081/how-to-assert-two-interfaces-contain-the-same-keys-in-typescript
type AssertKeysEqual<
  T1 extends Record<keyof T2, any>,
  T2 extends Record<keyof T1, any>
> = never
type Assertion = AssertKeysEqual<typeof zh_CN,typeof en>

export type LocaleTextKey = keyof typeof zh_CN;

export const locale = {
    zh_CN,
    en
}

export function createLocale(locale: typeof zh_CN) {

  function alert(title: LocaleTextKey, content: LocaleTextKey, intrp: string[] = []) {
    return ualert(locale[title], formatString(locale[content], intrp));
  }

  function prompt(title: LocaleTextKey, content: LocaleTextKey, intrp: string[] = []) {
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
    get
  };
}

export type Locale = ReturnType<typeof createLocale>;