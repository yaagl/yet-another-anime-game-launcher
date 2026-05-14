import { zh_CN } from "./zh_CN";
import { en } from "./en";
import { vi_VN } from "./vi_VN";
import { es_ES } from "./es_ES";
import { fr_FR } from "./fr_FR";
import { ru_RU } from "./ru_RU";
import { ko_KR } from "./ko_KR";
import { de_DE } from "./de_DE";
import { th_TH } from "./th_TH";
import { uk_UA } from "./uk_UA";
import {
  alert as ualert,
  prompt as uprompt,
  promptUpdate as upromptUpdate,
  formatString,
  getKey,
} from "../utils";
import { createSignal } from "solid-js";

export type LocaleTextKey = keyof typeof zh_CN;

export const locales = {
  zh_cn: zh_CN,
  en,
  vi_vn: vi_VN,
  es_es: es_ES,
  fr_fr: fr_FR,
  ru_ru: ru_RU,
  ko_kr: ko_KR,
  de_de: de_DE,
  th_th: th_TH,
  uk_ua: uk_UA,
};

export async function createLocale() {
  let lang = "zh_cn";
  try {
    lang = (await getKey("config_uiLocale")).toLowerCase();
  } catch {
    lang = `${navigator.language}`.replaceAll("-", "_").toLowerCase();
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
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore THIS IS A BUG
  const initialLanguage: keyof typeof locales = lang in locales ? lang : "en";
  const [currentLanguage, setCurrentLanguage] = createSignal(initialLanguage);

  function currentLocale() {
    return locales[currentLanguage()];
  }

  function alert(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    const locale = currentLocale();
    return ualert(locale[title], formatString(locale[content], intrp));
  }

  function prompt(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    const locale = currentLocale();
    return uprompt(locale[title], formatString(locale[content], intrp));
  }

  async function promptUpdate(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    const locale = currentLocale();
    return upromptUpdate(
      locale[title],
      formatString(locale[content], intrp),
      locale["SETTING_CANCEL"] as string,
      locale["UPDATE_PROMPT_IGNORE"] as string,
      locale["UPDATE_LAUNCHER"] as string
    );
  }

  function format(key: LocaleTextKey, intrp: string[]) {
    return formatString(currentLocale()[key], intrp);
  }

  function get(key: LocaleTextKey) {
    return currentLocale()[key];
  }

  function setLanguage(lang: string) {
    const nextLanguage = lang.toLowerCase() as keyof typeof locales;
    setCurrentLanguage(nextLanguage in locales ? nextLanguage : "en");
  }

  return {
    alert,
    prompt,
    promptUpdate,
    format,
    get,
    supportedLanguages: Object.entries(locales).map(
      ([id, { LANGUAGE_LOCALE_NAME }]) => {
        return {
          id,
          name: LANGUAGE_LOCALE_NAME,
        };
      }
    ),
    get currentLanguage() {
      return currentLanguage();
    },
    setLanguage,
  };
}

export type Locale = ReturnType<typeof createLocale> extends Promise<infer C>
  ? C
  : never;
