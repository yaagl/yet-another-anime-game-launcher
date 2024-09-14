import { Locale } from "@locale";
import { Server } from "@constants";
import {
  HoyoConnectGameBackground,
  HoyoConnectGamePackageMainfest,
  HoyoConnectGetAllGameBasicInfoResponse,
  HoyoConnectGetGamePackagesResponse,
} from "./launcher-info";
import { exec } from "@utils";

async function fetch(url: string) {
  const { stdOut } = await exec(["curl", url]);
  return {
    async json() {
      return JSON.parse(stdOut);
    },
  };
}

export async function getLatestAdvInfo(
  locale: Locale,
  server: Server,
): Promise<HoyoConnectGameBackground> {
  const ret: HoyoConnectGetAllGameBasicInfoResponse = await (
    await fetch(
      server.adv_url +
        (server.id == "CN"
          ? `&language=zh-cn` // CN server has no other language support
          : `&language=${locale.get("CONTENT_LANG_ID")}`),
    )
  ).json();
  const game = ret.data.game_info_list.find(x => x.game.biz == server.id);
  if (!game || game.backgrounds.length < 1)
    throw new Error(`failed to fetch game information: ${server.id}`);
  return game.backgrounds[0];
}

export async function getLatestVersionInfo(
  server: Server,
): Promise<HoyoConnectGamePackageMainfest> {
  const ret: HoyoConnectGetGamePackagesResponse = await (
    await fetch(server.update_url)
  ).json();
  const game = ret.data.game_packages.find(x => x.game.biz == server.id);
  if (!game) throw new Error(`failed to fetch game information: ${server.id}`);
  return game;
}
