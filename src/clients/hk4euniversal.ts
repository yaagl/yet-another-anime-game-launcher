import { CreateClientOptions } from "./shared";
import s from "../assets/Nahida.cr.png";
import { createClient as createCNClient } from "./hk4ecn";
import { createClient as createOSClient } from "./hk4eos";
import { ChannelClient } from "../channel-client";

export const DEFAULT_WINE_DISTRO_URL =
  "https://github.com/3Shain/winecx/releases/download/gi-wine-1.2/wine.tar.gz";
export const DEFAULT_WINE_DISTRO_TAG = "gi-wine-1.2";

export async function createClient(
  options: CreateClientOptions,
): Promise<ChannelClient> {
  if ((await Neutralino.os.getEnv("YAAGL_OVERSEA")) == "1") {
    return await createOSClient(options);
  } else {
    return await createCNClient(options);
  }
}

export const UPDATE_UI_IMAGE = s;
