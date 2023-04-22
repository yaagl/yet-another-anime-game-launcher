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
