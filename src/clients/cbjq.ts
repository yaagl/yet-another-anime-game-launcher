import { Server } from "./seasun/server";

import s from "../assets/Nahida.cr.png";

import type { CreateClientOptions } from "./shared";
import { createCBJQChannelClient } from "./seasun/cbjq";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/unstable-bh-gptk-1.0/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "unstable-bh-gptk-1.0";

const SERVER_DEFINITION: Server = {
  id: "CBJQ",
  manifest:
    "https://snowbreak-dl.amazingseasuncdn.com/6e5452634164107ee3c3cfd6efcdf55f/PC/updates/manifest.json",
  dlc: "https://snowbreak-dl.amazingseasuncdn.com/6e5452634164107ee3c3cfd6efcdf55f/PC/updates/",
  channel: "seasun",
  background_url:
    "https://cdn1.epicgames.com/spt-assets/e55df6d332b24ee18fb52af2bc530caa/snowbreak-containment-zone-1asa4.jpg",
};

export function createClient(options: CreateClientOptions) {
  return createCBJQChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;
