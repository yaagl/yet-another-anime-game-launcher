import s2 from "../assets/Aponia.cr.webp";
import { createBH3ChannelClient } from "./mhy/bh3";
import type { CreateClientOptions } from "./shared";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/winecx/releases/download/unstable-bh-wine-1.1/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "unstable-bh-wine-1.1";

export const UPDATE_UI_IMAGE = s2;

import { Server } from "@constants";
import {
  CN_COMPANY_NAME,
  BH3_GLB_EXECUTABLE,
  BH3_GLB_UPDATE_URL,
  BH3_GLB_ADV_URL,
  BH3_GLB_DATA_DIR,
} from "./secret";

export const SERVER_DEFINITION: Server = {
  id: "BH3_GLB",
  hosts: "",
  removed: [
    {
      file: atob("QkgzX0RhdGEvUGx1Z2lucy9jcmFzaHJlcG9ydC5leGU="),
    },
    {
      file: atob("QkgzX0RhdGEvUGx1Z2lucy92dWxrYW4tMS5kbGw="),
    },
  ],
  channel_id: 0, //?
  subchannel_id: 0, //?
  cps: "", //?
  patched: [],
  product_name: "?",
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME,
  executable: BH3_GLB_EXECUTABLE,
  update_url: BH3_GLB_UPDATE_URL,
  adv_url: BH3_GLB_ADV_URL,
  dataDir: BH3_GLB_DATA_DIR,
  added: [],
};

export function createClient(options: CreateClientOptions) {
  return createBH3ChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}
