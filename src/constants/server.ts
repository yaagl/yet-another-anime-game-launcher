import b from "../../external/dW5pdHlwbGF5ZXJfcGF0Y2hfYmIudmNkaWZmCg==.vcdiff?url";
import c from "../../external/dW5pdHlwbGF5ZXJfcGF0Y2hfY24udmNkaWZmCg==.vcdiff?url";
import d from "../../external/dW5pdHlwbGF5ZXJfcGF0Y2hfb3MudmNkaWZmCg==.vcdiff?url";
import e from "../../external/eGx1YV9wYXRjaF9jbi52Y2RpZmYK.vcdiff?url";
import f from "../../external/eGx1YV9wYXRjaF9vcy52Y2RpZmYK.vcdiff?url";
import {
  CN_ADV_URL,
  CN_COMPANY_NAME,
  CN_CPS,
  CN_DATA_DIR,
  CN_EXECUTABLE,
  CN_PRODUCT_NAME,
  CN_UPDATE_URL,
  DLL1,
  DLL2,
  OS_ADV_URL,
  OS_CPS,
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
      plugins: {}[]; // not necessary
      version: string;
    };
    pre_download_game: null; // fixme:
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

export const CN_SERVER = {
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
    // {
    //   file: `${CN_DATA_DIR}/Plugins/${DLL2}` as const,
    //   diffUrl: e,
    // },
  ],
  removed: [
    // "bWh5cGJhc2UuZGxs",
    "WXVhblNoZW5fRGF0YS91cGxvYWRfY3Jhc2guZXhl",
    "WXVhblNoZW5fRGF0YS9QbHVnaW5zL2NyYXNocmVwb3J0LmV4ZQ==",
    "WXVhblNoZW5fRGF0YS9QbHVnaW5zL3Z1bGthbi0xLmRsbA==",
  ],
};

export type Server = typeof CN_SERVER;

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
    // {
    //   file: `${OS_DATA_DIR}/Plugins/${DLL2}` as const,
    //   diffUrl: f,
    // },
  ],
  removed: [
    // "bWh5cGJhc2UuZGxs",
    "R2Vuc2hpbkltcGFjdF9EYXRhL3VwbG9hZF9jcmFzaC5leGU=",
    "R2Vuc2hpbkltcGFjdF9EYXRhL1BsdWdpbnMvY3Jhc2hyZXBvcnQuZXhl",
    "R2Vuc2hpbkltcGFjdF9EYXRhL1BsdWdpbnMvdnVsa2FuLTEuZGxs",
  ],
};
