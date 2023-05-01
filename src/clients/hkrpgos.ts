import { Server } from "@constants";

import s from "../assets/SilverWolf.cr.png";

import a from "../../external/hkrpg/os/diffs/U3RhclJhaWxCYXNlLmRsbC52Y2RpZmYK.vcdiff?url";
import b from "../../external/hkrpg/os/diffs/VW5pdHlQbGF5ZXIuZGxsLnZjZGlmZgo=.vcdiff?url";
import d from "../../external/hkrpg/os/files/VFZNQm9vdHN0cmFwLmRsbAo=.dll?url";
import c from "../../external/hkrpg/os/files/R2VuZXJhdGVkCg==.Generated/dHZtX2FsbG9jYXRpb25fdGFibGUuZGF0Cg==.dat?url";
import e from "../../external/hkrpg/os/files/R2VuZXJhdGVkCg==.Generated/dHZtX2VudHJ5X3RhYmxlLmRhdAo=.dat?url";

import { createHKRPGChannelClient } from "./mhy/hkrpg";
import type { CreateClientOptions } from "./shared";
import {
  CN_COMPANY_NAME,
  DLL1,
  DLL5,
  FILE1,
  FILE2,
  FILE3,
  HKRPG_DATA_DIR,
  HKRPG_EXECUTABLE,
  HKRPG_OS_ADV_URL,
  HKRPG_OS_CPS,
  HKRPG_OS_UPDATE_URL,
  HKRPG_REMOVED,
} from "./secret";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/winecx/releases/download/unstable-bh-wine-1.0.2/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "unstable-bh-wine-1.0.2";

export const SERVER_DEFINITION: Server = {
  id: "hkrpg_os",
  update_url: HKRPG_OS_UPDATE_URL,
  channel_id: 1,
  subchannel_id: 1,
  cps: HKRPG_OS_CPS,
  adv_url: HKRPG_OS_ADV_URL,
  dataDir: HKRPG_DATA_DIR,
  executable: HKRPG_EXECUTABLE,
  THE_REAL_COMPANY_NAME: CN_COMPANY_NAME, // that's correct 😎
  product_name: "",
  patched: [
    {
      file: DLL5,
      diffUrl: a,
    },
    {
      file: DLL1,
      diffUrl: b,
    },
  ],
  removed: HKRPG_REMOVED,
  hosts: "",
  added: [
    {
      file: FILE1,
      url: d,
    },
    {
      file: FILE2,
      url: e,
    },
    {
      file: FILE3,
      url: c,
    },
  ],
};

export function createClient(options: CreateClientOptions) {
  return createHKRPGChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
