import { ChannelClient } from "../../channel-client";
import { Server } from "@constants";
import { Locale } from "@locale";
import { exec, log } from "@utils";

type Background = {
  type: string;
  background?: { url: string };
  icon?: { url: string; link: string };
  video?: { url: string };
  theme?: { url: string };
};

export async function getGameArtwork(
  locale: Locale,
  server: Server,
  fallbackIcon: string
): Promise<ChannelClient["uiContent"]> {
  try {
    const language = server.id.endsWith("_cn")
      ? "zh-cn"
      : locale.get("CONTENT_LANG_ID");
    const { stdOut } = await exec([
      "curl",
      "--fail",
      "--silent",
      "--show-error",
      "--max-time",
      "10",
      server.adv_url + "&language=" + language,
    ]);
    const response: {
      data: {
        game_info_list: { game: { biz: string }; backgrounds: Background[] }[];
      };
    } = JSON.parse(stdOut);
    const backgrounds =
      response.data.game_info_list.find(game => game.game.biz === server.id)
        ?.backgrounds ?? [];
    const artwork =
      backgrounds.find(
        background => background.type === "BACKGROUND_TYPE_VIDEO"
      ) ?? backgrounds[0];
    if (!artwork) throw new Error("No artwork for " + server.id);
    const video = artwork.type === "BACKGROUND_TYPE_VIDEO";
    return {
      background: artwork.background?.url,
      background_video: video ? artwork.video?.url : undefined,
      background_theme: video ? artwork.theme?.url : undefined,
      iconImage: artwork.icon?.url || fallbackIcon,
      url: artwork.icon?.link ?? "",
    };
  } catch (error) {
    await log("Could not load game artwork: " + String(error));
    return { iconImage: fallbackIcon, url: "" };
  }
}
