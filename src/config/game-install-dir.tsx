import {
  createIcon,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
} from "@hope-ui/solid";
import { createSignal } from "solid-js";
import { Locale } from "../locale";
import { Config, NOOP } from "./config-def";

export async function createGameInstallDirConfig({
  locale,
  gameInstallDir,
}: {
  config: Partial<Config>;
  locale: Locale;
  gameInstallDir: () => string;
}) {
  // try get s

  async function onSave(apply: boolean) {
    return NOOP;
  }

  return [
    function UI() {
      return (
        <FormControl id="gameInstallDir">
          <FormLabel>{locale.get("SETTING_GAME_INSTALL_DIR")}</FormLabel>
          <InputGroup>
            <Input disabled readOnly value={gameInstallDir()} />
            {/* <InputRightElement cursor={"pointer"} onClick={() => {}}>
                    <IconSetting boxSize="20px" color={"$blackAlpha9"} />
                  </InputRightElement> */}
          </InputGroup>
        </FormControl>
      );
    },
    onSave,
  ] as const;
}

const IconSetting = createIcon({
  viewBox: "0 0 1024 1024",
  path() {
    return (
      <>
        <path
          fill="currentColor"
          d="M848 421.2c-16.6 0-30 13.4-30 30V770c0 38.6-31.4 70-70 70H272.1c-38.6 0-70-31.4-70-70V294.8c0-38.6 31.4-70 70-70h317.7c16.6 0 30-13.4 30-30s-13.4-30-30-30H272.1c-71.7 0-130.1 58.3-130.1 129.9v475.2c0 71.6 58.4 129.9 130.1 129.9h475.8c71.7 0 130.1-58.3 130.1-129.9V451.2c0-16.6-13.4-30-30-30z"
          p-id="2764"
        ></path>
        <path
          fill="currentColor"
          d="M443.7 572.5c11.7 11.7 30.8 11.7 42.4 0l383.4-383.4c11.7-11.7 11.7-30.8 0-42.4-11.7-11.7-30.8-11.7-42.4 0L443.7 530.1c-11.7 11.7-11.7 30.8 0 42.4z"
          p-id="2765"
        ></path>
      </>
    );
  },
});
