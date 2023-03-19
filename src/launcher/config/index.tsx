import {
  Button,
  Divider,
  HStack,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  VStack,
} from "@hope-ui/solid";
import { Locale } from "../../locale";
import { WineVersionChecker } from "../../wine";
import { Config } from "./config-def";
import { createDxvkAsyncConfig } from "./dxvk-async";
import { createDxvkHUDConfig } from "./dxvk-hud";
import { createGameInstallDirConfig } from "./game-install-dir";
import { createRetinaConfig } from "./retina";
import { createWineDistroConfig } from "./wine-distribution";

export async function createConfiguration({
  wineVersionChecker,
  locale,
  gameInstallDir,
}: {
  wineVersionChecker: WineVersionChecker;
  locale: Locale;
  gameInstallDir: () => string;
}) {
  const config: Partial<Config> = {};
  const [WD, saveWD] = await createWineDistroConfig({
    locale,
    config,
    wineVersionChecker,
  });
  const [DA, saveDA] = await createDxvkAsyncConfig({ locale, config });
  const [DH, saveDH] = await createDxvkHUDConfig({ locale, config });
  const [R, saveRetina] = await createRetinaConfig({ locale, config });
  const [GID, saveGID] = await createGameInstallDirConfig({
    locale,
    config,
    gameInstallDir,
  });

  return {
    UI: function (props: {
      onClose: (action: "check-integrity" | "close") => void;
    }) {
      async function onSave(apply: boolean) {
        const postAction = await Promise.all([
          saveWD(apply),
          saveDA(apply),
          saveDH(apply),
          saveRetina(apply),
          saveGID(apply),
        ]);
        await Promise.all(postAction.map((x) => x()));
      }
      return (
        <ModalContent>
          <ModalHeader>{locale.get("SETTING")}</ModalHeader>
          <ModalBody>
            <VStack spacing={"$4"}>
              <GID />
              <WD />
              <Divider />
              <DA />
              <DH />
              <R />
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={"$4"}>
              <Button
                variant="outline"
                onClick={() =>
                  onSave(false).then(() => props.onClose("check-integrity"))
                }
              >
                {locale.get("SETTING_CHECK_INTEGRITY")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  onSave(false).then(() => props.onClose("close"));
                }}
              >
                {locale.get("SETTING_CANCEL")}
              </Button>
              <Button
                onClick={() => {
                  onSave(true).then(() => props.onClose("close"));
                }}
              >
                {locale.get("SETTING_SAVE")}
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      );
    },
    config: config as Config, // FIXME: better method than type assertation?
  };
}

export type { Config };
