import { Server } from "@constants";

// import b from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfYmIudmNkaWZmCg==.vcdiff?url";
// import c from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfY24udmNkaWZmCg==.vcdiff?url";

import s from "../assets/Nahida.cr.png";

import { createHK4EChannelClient } from "./mhy/hk4e";
import type { CreateClientOptions } from "./shared";
import {
  CN_UPDATE_URL,
  CN_CPS,
  CN_ADV_URL,
  CN_DATA_DIR,
  CN_EXECUTABLE,
  CN_COMPANY_NAME,
  CN_PRODUCT_NAME,
  DLL1,
  DLL2,
  CN_CUSTOM_HOSTS,
} from "./secret";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "9.9-dxmt";

const SERVER_DEFINITION: Server = {
  id: "hk4e_cn",
  update_url: CN_UPDATE_URL,
  channel_id: 1,
  subchannel_id: 1,
  cps: CN_CPS,
  adv_url: CN_ADV_URL,
  dataDir: CN_DATA_DIR,
  executable: CN_EXECUTABLE,
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME,
  product_name: CN_PRODUCT_NAME,
  patched: [
    // {
    //   file: DLL1,
    //   diffUrl: c,
    // },
    // {
    //   file: `${CN_DATA_DIR}/Plugins/${DLL2}` as const,
    //   diffUrl: e,
    //   tag: "workaround3",
    // },
  ],
  removed: [
    {
      file: atob("WXVhblNoZW5fRGF0YS91cGxvYWRfY3Jhc2guZXhl"),
    },
    {
      file: atob("WXVhblNoZW5fRGF0YS9QbHVnaW5zL2NyYXNocmVwb3J0LmV4ZQ=="),
    },
    {
      file: atob("WXVhblNoZW5fRGF0YS9QbHVnaW5zL3Z1bGthbi0xLmRsbA=="),
    },
    // {
    //   file: atob("bWh5cGJhc2UuZGxs"),
    //   tag: "workaround3",
    // },
  ],
  hosts: CN_CUSTOM_HOSTS,
  added: [],
};

export function createClient(options: CreateClientOptions) {
  return createHK4EChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
