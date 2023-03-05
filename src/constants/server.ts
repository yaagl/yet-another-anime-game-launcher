export interface Server {
  id: string;
  url: string;
  channel_id: number;
  subchannel_id: number;
  bg_url: string;
}

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

export const CN_SERVER: Server = {
  id: "CN",
  url: atob(
    "aHR0cHM6Ly9zZGstc3RhdGljLm1paG95by5jb20vaGs0ZV9jbi9tZGsvbGF1bmNoZXIvYXBpL3Jlc291cmNlP2NoYW5uZWxfaWQ9MSZrZXk9ZVlkODlKbUombGF1bmNoZXJfaWQ9MTg="
  ),
  channel_id: 1,
  subchannel_id: 1,
  bg_url: atob(
    "aHR0cHM6Ly9zZGstc3RhdGljLm1paG95by5jb20vaGs0ZV9jbi9tZGsvbGF1bmNoZXIvYXBpL2NvbnRlbnQ/ZmlsdGVyX2Fkdj10cnVlJmtleT1lWWQ4OUptSiZsYXVuY2hlcl9pZD0xOCZsYW5ndWFnZT16aC1jbg=="
  ),
};

export const OS_SERVER: Server = {
  id: "OS",
  url: atob(
    "aHR0cHM6Ly9zZGstb3Mtc3RhdGljLm1paG95by5jb20vaGs0ZV9nbG9iYWwvbWRrL2xhdW5jaGVyL2FwaS9yZXNvdXJjZT9jaGFubmVsX2lkPTEma2V5PWdjU3RnYXJoJmxhdW5jaGVyX2lkPTEw"
  ),
  channel_id: 1,
  subchannel_id: 0,
  bg_url: "",
};
