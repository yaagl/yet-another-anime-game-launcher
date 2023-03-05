import zh_CN from "./zh_CN";
import en from "./en";

// https://stackoverflow.com/questions/67027081/how-to-assert-two-interfaces-contain-the-same-keys-in-typescript
type AssertKeysEqual<
  T1 extends Record<keyof T2, any>,
  T2 extends Record<keyof T1, any>
> = never
type Assertion = AssertKeysEqual<typeof zh_CN,typeof en>

export const locale = {
    zh_CN,
    en
}

export function lstr(templates: string[], ...args: string[]) {
  
}