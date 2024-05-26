import { Server } from "./seasun/server";

import s from "../assets/Nahida.cr.png";

import type { CreateClientOptions } from "./shared";
import { createCBJQChannelClient } from "./seasun/cbjq";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.2-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "v9.2-mingw";

/** It's broken due to AntiCheat */
const SERVER_DEFINITION: Server = {
  id: "CBJQCN",
  manifest: "https://cbjq.xoyocdn.com/DLC7/PC/updates/manifest.json",
  dlc: "https://cbjq.xoyocdn.com/DLC7/PC/updates",
  channel: "jinshan",
  background_url:
    "https://cdn1.epicgames.com/spt-assets/e55df6d332b24ee18fb52af2bc530caa/snowbreak-containment-zone-aeglp.jpg",
};

export function createClient(options: CreateClientOptions) {
  return createCBJQChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
