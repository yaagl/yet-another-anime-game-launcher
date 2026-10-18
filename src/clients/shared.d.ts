import { Aria2 } from "@aria2";
import { Locale } from "@locale";
import { Wine } from "@wine";

export interface CreateClientOptions {
  aria2: Aria2;
  wine: Wine;
  locale: Locale;
}
