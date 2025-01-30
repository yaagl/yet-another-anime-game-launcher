import { Server } from "@constants";

// import b from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfYmIudmNkaWZmCg==.vcdiff?url";
// import c from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfY24udmNkaWZmCg==.vcdiff?url";

import s from "../assets/Nahida.cr.png";

import { createNAPChannelClient } from "./mhy/nap";
import type { CreateClientOptions } from "./shared";
import {
  OS_UPDATE_URL,
  OS_ADV_URL,
  CN_COMPANY_NAME,
  NAP_DATA_DIR,
  NAP_EXECUTABLE,
  NAP_PROGRAM_NAME,
  NAP_CPS,
  NAP_REMOVED,
  OS_CUSTOM_HOSTS,
} from "./secret";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "9.9-dxmt";

const SERVER_DEFINITION: Server = {
  id: "nap_global",
  update_url: OS_UPDATE_URL,
  channel_id: 1,
  subchannel_id: 0,
  cps: NAP_CPS,
  adv_url: OS_ADV_URL,
  dataDir: NAP_DATA_DIR,
  executable: NAP_EXECUTABLE,
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME,
  product_name: NAP_PROGRAM_NAME,
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
  removed: NAP_REMOVED,
  hosts: OS_CUSTOM_HOSTS,
  added: [],
};

export function createClient(options: CreateClientOptions) {
  return createNAPChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
