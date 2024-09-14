/**
 * All type and data defined in this file can be shared in all games of 'the company'.
 */

interface VoicePackFileInfo {
  language: "zh-cn" | "en-us" | "ja-jp" | "ko-kr";
  name: string;
  package_size: string;
  size: string;
  path: string;
  md5: string;
}

interface GameFileInfo {
  name: string;
  path: string;
  package_size: string;
  md5: string;
  version: string;
  size: string;
  entry: string;
  decompressed_path: string;
  voice_packs: VoicePackFileInfo[];
  segments: {
    md5: string;
    path: string;
  }[];
}

export interface LauncherResourceData {
  data: {
    deprecated_files: {
      name: string;
      md5: string;
    }[];
    deprecated_packages: [];
    force_update: null;
    game: {
      latest: GameFileInfo;
      diffs: {
        is_recommended_update: boolean;
        md5: string;
        name: string;
        package_size: string;
        path: string;
        size: string;
        version: string;
        voice_packs: VoicePackFileInfo[];
      }[];
    };
    plugin: {
      plugins: unknown[]; // not necessary
      version: string;
    };
    pre_download_game: null | {
      latest: GameFileInfo;
      diffs: {
        is_recommended_update: boolean;
        md5: string;
        name: string;
        package_size: string;
        path: string;
        size: string;
        version: string;
        voice_packs: VoicePackFileInfo[];
      }[];
    };
    sdk: null;
    web_url: string;
  };
  message: string;
  retcode: number;
}

export interface LauncherContentData {
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

export interface HoyoConnectImage {
  hover_url?: string;
  link: string;
  url: string;
}

export interface HoyoConnectGameId {
  biz: string;
  id: string;
}

export interface HoyoConnectGameDisplay {
  display: {
    language: string;
    name: string;
    subtitle: string;
    background: HoyoConnectImage;
    thumbnail: HoyoConnectImage;
    logo: HoyoConnectImage;
    icon: HoyoConnectImage;
  };
  display_status: string;
}

export interface HoyoConnectGameBackground {
  id: string;
  background: {
    url: string;
    link: string;
  };
  icon: {
    url: string;
    hover_url: string;
    link: string;
  };
}

export interface HoyoConnectGetGamesResponse {
  retcode: number;
  message: string;
  data: {
    games: (HoyoConnectGameId & HoyoConnectGameDisplay)[];
  };
}

export interface HoyoConnectGetAllGameBasicInfoResponse {
  retcode: number;
  message: string;
  data: {
    game_info_list: ({ game: HoyoConnectGameId } & {
      backgrounds: HoyoConnectGameBackground[];
    })[];
  };
}

export interface HoyoConnectGamePackages {
  version: string;
  res_list_url: string;
  game_pkgs: {
    url: string;
    size: string;
    md5: string;
    decompressed_size: string;
  }[];
  audio_pkgs: {
    decompressed_size: string;
    language: string;
    md5: string;
    size: string;
    url: string;
  }[];
}

export interface HoyoConnectGamePackageMainfest {
  game: HoyoConnectGameId;
  main: {
    major: HoyoConnectGamePackages;
    patches: HoyoConnectGamePackages[];
  };
  pre_download: {
    major: HoyoConnectGamePackages;
    patches: HoyoConnectGamePackages[];
  };
}

export interface HoyoConnectGetGamePackagesResponse {
  retcode: number;
  message: string;
  data: {
    game_packages: HoyoConnectGamePackageMainfest[];
  };
}

export const VoicePacks = {
  Chinese: "zh-cn",
  "English(US)": "en-us",
  Japanese: "ja-jp",
  Korean: "ko-kr",
};

export const VoicePackNames = Object.fromEntries(
  Object.entries(VoicePacks).map(([k, v]) => [v, k]),
);
