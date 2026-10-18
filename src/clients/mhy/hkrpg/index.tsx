import { ChannelClient } from "../../../channel-client";
import { Server } from "@constants";
import { Locale } from "@locale";
import { Config } from "@config";
import { Aria2 } from "@aria2";
import { Wine } from "@wine";
import { getKey } from "@utils";
import { createSophonGame } from "../../../sophon/game";
import { launchGameProgram } from "./program-launch-game";
import { getGameArtwork } from "../artwork";
import { patchRevertProgram } from "../patch";
import {
  checkAndDownloadDXMT,
  checkAndDownloadReshade,
  checkAndDownloadJadeite,
} from "../../../downloadable-resource";
import icon from "../../../icons/March7th.cr.png";
import createPatchOff from "./config/patch-off";
import createBlockNet from "./config/block-net";

export async function createHKRPGChannelClient({
  server,
  locale,
  aria2,
  wine,
}: {
  server: Server;
  locale: Locale;
  aria2: Aria2;
  wine: Wine;
}): Promise<ChannelClient> {
  const game = await createSophonGame(server, locale);
  return {
    ...game,
    sophon: game,
    uiContent: await getGameArtwork(locale, server, icon),
    async *launch(config: Config) {
      if (!(await game.canLaunch())) return;
      if (config.reshade) {
        yield* checkAndDownloadReshade(aria2, wine, game.installDir());
      }
      if (wine.attributes.renderBackend == "dxmt") {
        yield* checkAndDownloadDXMT(aria2);
      }
      yield* checkAndDownloadJadeite(aria2);
      yield* launchGameProgram({
        gameDir: game.installDir(),
        wine,
        gameExecutable: server.executable,
        config,
        server,
      });
    },
    async *init(config: Config) {
      if (!game.installDir()) return;
      const patched = await getKey("patched").catch(() => "");
      if (patched) {
        try {
          yield* patchRevertProgram(game.installDir(), wine, server, config);
        } catch {
          yield* game.checkIntegrity();
        }
      }
      await game.refresh();
    },
    async createConfig(locale: Locale, config: Partial<Config>) {
      const [PO] = await createPatchOff({ locale, config });
      const [BN] = await createBlockNet({ locale, config });

      return function () {
        return ["Game Version: ", game.gameVersion(), <PO />, <BN />];
      };
    },
  };
}
