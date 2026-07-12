import { Server } from "./nte/server";

import s from "../assets/logo.svg";

import type { CreateClientOptions } from "./shared";
import { createNTEChannelClient } from "./nte";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "11.0-1-crossover-signed-experimental";

const SERVER_DEFINITION: Server = {
  id: "nte_global",
  productName: "Neverness to Everness",
  websiteUrl: "https://nte.perfectworld.com/",
  backgroundUrl: "https://nte.perfectworld.com/favicon.ico",
  executableCandidates: [
    "NTEGlobalGame.exe",
    "NTEGlobalLauncher.exe",
    "NTE.exe",
    "NevernessToEverness.exe",
    "Game/Binaries/Win64/Game.exe",
    "NTE/Binaries/Win64/NTE-Win64-Shipping.exe",
    "WindowsNoEditor/NTE/Binaries/Win64/NTE-Win64-Shipping.exe",
  ],
};

export function createClient(options: CreateClientOptions) {
  return createNTEChannelClient({
    server: SERVER_DEFINITION,
    ...options,
  });
}

export const UPDATE_UI_IMAGE = s;