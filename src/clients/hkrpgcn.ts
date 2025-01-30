import { Server } from "@constants";

import s from "../assets/SilverWolf.cr.png";

import { createHKRPGChannelClient } from "./mhy/hkrpg";
import type { CreateClientOptions } from "./shared";
import {
  CN_COMPANY_NAME,
  HKRPG_CN_ADV_URL,
  HKRPG_CN_CPS,
  HKRPG_CN_UPDATE_URL,
  HKRPG_DATA_DIR,
  HKRPG_EXECUTABLE,
  HKRPG_REMOVED,
} from "./secret";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "9.9-dxmt";

export const SERVER_DEFINITION: Server = {
  id: "hkrpg_cn",
  update_url: HKRPG_CN_UPDATE_URL,
  channel_id: 1,
  subchannel_id: 1,
  cps: HKRPG_CN_CPS,
  adv_url: HKRPG_CN_ADV_URL,
  dataDir: HKRPG_DATA_DIR,
  executable: HKRPG_EXECUTABLE,
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME, // that's correct 😎
  product_name: "?",
  patched: [],
  removed: HKRPG_REMOVED,
  hosts: "",
  added: [],
};

export function createClient(options: CreateClientOptions) {
  return createHKRPGChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
