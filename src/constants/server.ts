import b from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfYmIudmNkaWZmCg==.vcdiff?url";
import c from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfY24udmNkaWZmCg==.vcdiff?url";
import d from "../../external/hk4e/dW5pdHlwbGF5ZXJfcGF0Y2hfb3MudmNkaWZmCg==.vcdiff?url";
import e from "../../external/hk4e/eGx1YV9wYXRjaF9jbi52Y2RpZmYK.vcdiff?url";
import f from "../../external/hk4e/eGx1YV9wYXRjaF9vcy52Y2RpZmYK.vcdiff?url";
import {
  BH3_GLB_ADV_URL,
  BH3_GLB_DATA_DIR,
  BH3_GLB_EXECUTABLE,
  BH3_GLB_UPDATE_URL,
  CN_ADV_URL,
  CN_COMPANY_NAME,
  CN_CPS,
  CN_CUSTOM_HOSTS,
  CN_DATA_DIR,
  CN_EXECUTABLE,
  CN_PRODUCT_NAME,
  CN_UPDATE_URL,
  DLL1,
  DLL2,
  DLL4,
  FILE1,
  FILE2,
  FILE3,
  OS_ADV_URL,
  OS_CPS,
  OS_CUSTOM_HOSTS,
  OS_DATA_DIR,
  OS_EXECUTABLE,
  OS_PRODUCT_NAME,
  OS_UPDATE_URL,
} from "./server_secret";

interface VoicePackDef {
  language: "zh-cn" | "en-us" | "ja-jp" | "ko-kr";
  name: string;
  package_size: string;
  size: string;
  path: string;
  md5: string;
}

interface GameDef {
  name: string;
  path: string;
  package_size: string;
  md5: string;
  version: string;
  size: string;
  entry: string;
  decompressed_path: string;
  voice_packs: VoicePackDef[];
  segments: {
    md5: string;
    path: string;
  }[];
}

export interface ServerVersionData {
  data: {
    deprecated_files: {
      name: string;
      md5: string;
    }[];
    deprecated_packages: [];
    force_update: null;
    game: {
      latest: GameDef;
      diffs: {
        is_recommended_update: boolean;
        md5: string;
        name: string;
        package_size: string;
        path: string;
        size: string;
        version: string;
        voice_packs: VoicePackDef[];
      }[];
    };
    plugin: {
      plugins: unknown[]; // not necessary
      version: string;
    };
    pre_download_game: null | {
      latest: GameDef;
      diffs: {
        is_recommended_update: boolean;
        md5: string;
        name: string;
        package_size: string;
        path: string;
        size: string;
        version: string;
        voice_packs: VoicePackDef[];
      }[];
    };
    sdk: null;
    web_url: string;
  };
  message: string;
  retcode: number;
}

export interface ServerContentData {
  data: {
    adv: {
      background: string;
      bg_checksum: string;
      icon: string;
      url: string;
      version: string;
    };
    banner: [];
    icon: [];
    links: {
      faq: string;
      version: string;
    };
    more: null;
    post: [];
    qq: [];
  };
  message: string;
  retcode: number;
}

export type Server = {
  id: string;
  update_url: string;
  adv_url: string;
  cps: string;
  channel_id: number;
  subchannel_id: number;
  removed: {
    file: string;
    tag?: string;
  }[];
  product_name: string;
  executable: string;
  dataDir: string;
  THE_REAL_COMPANY_NAME: string;
  added: {
    file: string;
    url: string;
  }[];
  patched: {
    file: string;
    diffUrl: string;
    tag?: string;
  }[];
  hosts: string; // ?
};

export const CN_SERVER: Server = {
  id: "CN",
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
    {
      file: DLL1,
      diffUrl: c,
    },
    {
      file: `${CN_DATA_DIR}/Plugins/${DLL2}` as const,
      diffUrl: e,
      tag: "workaround3",
    },
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
    {
      file: atob("bWh5cGJhc2UuZGxs"),
      tag: "workaround3",
    },
  ],
  hosts: CN_CUSTOM_HOSTS,
  added: [],
};

export const OS_SERVER: Server = {
  id: "OS",
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
    {
      file: DLL1,
      diffUrl: d,
    },
    {
      file: `${OS_DATA_DIR}/Plugins/${DLL2}` as const,
      diffUrl: f,
      tag: "workaround3",
    },
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
    {
      file: atob("bWh5cGJhc2UuZGxs"),
      tag: "workaround3",
    },
  ],
  hosts: OS_CUSTOM_HOSTS,
  added: [],
};

import x from "../../external/bh3/diffs/QkgzQmFzZS5kbGwudmNkaWZmCg==.vcdiff?url";
import y from "../../external/bh3/diffs/VW5pdHlQbGF5ZXIuZGxsLnZjZGlmZgo=.vcdiff?url";
import a0 from "../../external/bh3/files/VFZNQm9vdHN0cmFwLmRsbAo=.dll?url";
import a1 from "../../external/bh3/files/R2VuZXJhdGVkCg==.Generated/dHZtX2FsbG9jYXRpb25fdGFibGUuZGF0Cg==.dat?url";
import a2 from "../../external/bh3/files/R2VuZXJhdGVkCg==.Generated/dHZtX2VudHJ5X3RhYmxlLmRhdAo=.dat?url";

export const BH3_GLB: Server = {
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
