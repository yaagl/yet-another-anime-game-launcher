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
} from "../../../downloadable-resource";
import icon from "../../../icons/Paimon.cr.png";
import { createWorkaround3Config } from "./config/workaround-3";
import createPatchOff from "./config/patch-off";
import createSteamPatch from "./config/steam-patch";
import createBlockNet from "./config/block-net";
import createResolution from "./config/resolution";
import createTimeoutFix from "./config/timeout-fix";
import { createEnableHDRConfig } from "./config/enable-hdr";

export async function createHK4EChannelClient({
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
      const [W3] = await createWorkaround3Config({ locale, config });
      const [PO] = await createPatchOff({ locale, config });
      const [SP] = await createSteamPatch({ locale, config });
      const [BN] = await createBlockNet({ locale, config });
      const [HDR] = await createEnableHDRConfig({ locale, config });
      const [RES] = await createResolution({ locale, config });
      const [TF] = await createTimeoutFix({ locale, config });

      return function () {
        return [
          "Game Version: ",
          game.gameVersion(),
          <HDR />,
          <W3 />,
          <PO />,
          <SP />,
          <BN />,
          <RES />,
          <TF />,
        ];
      };
    },
  };
}
