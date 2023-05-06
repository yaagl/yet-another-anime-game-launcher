import s2 from "../assets/Aponia.cr.webp";
import { createBH3ChannelClient } from "./mhy/bh3";
import type { CreateClientOptions } from "./shared";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/winecx/releases/download/unstable-bh-wine-1.0.2/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "unstable-bh-wine-1.0.2";

export const UPDATE_UI_IMAGE = s2;

import x from "../../external/bh3/glb/diffs/QkgzQmFzZS5kbGwudmNkaWZmCg==.vcdiff?url";
import y from "../../external/bh3/glb/diffs/VW5pdHlQbGF5ZXIuZGxsLnZjZGlmZgo=.vcdiff?url";
import a0 from "../../external/bh3/glb/files/VFZNQm9vdHN0cmFwLmRsbAo=.dll?url";
import a1 from "../../external/bh3/glb/files/R2VuZXJhdGVkCg==.Generated/dHZtX2FsbG9jYXRpb25fdGFibGUuZGF0Cg==.dat?url";
import a2 from "../../external/bh3/glb/files/R2VuZXJhdGVkCg==.Generated/dHZtX2VudHJ5X3RhYmxlLmRhdAo=.dat?url";
import { Server } from "@constants";
import {
  DLL4,
  DLL1,
  CN_COMPANY_NAME,
  BH3_GLB_EXECUTABLE,
  BH3_GLB_UPDATE_URL,
  BH3_GLB_ADV_URL,
  BH3_GLB_DATA_DIR,
  FILE1,
  FILE3,
  FILE2,
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
  patched: [
    {
      file: DLL4,
      diffUrl: x,
    },
    {
      file: DLL1,
      diffUrl: y,
    },
  ],
  product_name: "?",
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME,
  executable: BH3_GLB_EXECUTABLE,
  update_url: BH3_GLB_UPDATE_URL,
  adv_url: BH3_GLB_ADV_URL,
  dataDir: BH3_GLB_DATA_DIR,
  added: [
    {
      file: FILE1,
      url: a0,
    },
    {
      file: FILE3,
      url: a1,
    },
    {
      file: FILE2,
      url: a2,
    },
  ],
};

export function createClient(options: CreateClientOptions) {
  return createBH3ChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}
