import { Server } from "@constants";

// import d from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfb3MudmNkaWZmCg==.vcdiff?url";

import s from "../assets/Nahida.cr.png";

import { createHK4EChannelClient } from "./mhy/hk4e";
import type { CreateClientOptions } from "./shared";
import {
  OS_UPDATE_URL,
  OS_CPS,
  OS_ADV_URL,
  OS_DATA_DIR,
  OS_EXECUTABLE,
  CN_COMPANY_NAME,
  OS_PRODUCT_NAME,
  DLL1,
  DLL2,
  OS_CUSTOM_HOSTS,
} from "./secret";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "9.9-dxmt";

const SERVER_DEFINITION: Server = {
  id: "hk4e_global",
  update_url: OS_UPDATE_URL,
  channel_id: 1,
  subchannel_id: 0,
  cps: OS_CPS,
  adv_url: OS_ADV_URL,
  dataDir: OS_DATA_DIR,
  executable: OS_EXECUTABLE,
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME, // that's correct 😎
  product_name: OS_PRODUCT_NAME,
  patched: [
    // {
    //   file: DLL1,
    //   diffUrl: d,
    // },
    // {
    //   file: `${OS_DATA_DIR}/Plugins/${DLL2}` as const,
    //   diffUrl: f,
    //   tag: "workaround3",
    // },
  ],
  removed: [
    {
      file: atob("R2Vuc2hpbkltcGFjdF9EYXRhL3VwbG9hZF9jcmFzaC5leGU="),
    },
    {
      file: atob("R2Vuc2hpbkltcGFjdF9EYXRhL1BsdWdpbnMvY3Jhc2hyZXBvcnQuZXhl"),
    },
    {
      file: atob("R2Vuc2hpbkltcGFjdF9EYXRhL1BsdWdpbnMvdnVsa2FuLTEuZGxs"),
    },
    // {
    //   file: atob("bWh5cGJhc2UuZGxs"),
    //   tag: "workaround3",
    // },
  ],
  hosts: OS_CUSTOM_HOSTS,
  added: [],
};

export function createClient(options: CreateClientOptions) {
  return createHK4EChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
