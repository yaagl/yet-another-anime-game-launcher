import { Aria2 } from "@aria2";
import { Sophon } from "@sophon";
import { Locale } from "@locale";
import { Wine } from "@wine";

export interface CreateClientOptions {
  aria2: Aria2;
  sophon: Sophon;
  wine: Wine;
  locale: Locale;
}
