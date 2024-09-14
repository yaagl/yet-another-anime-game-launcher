import { JSXElement } from "solid-js";
import { CommonUpdateProgram } from "./common-update-ui";
import { Config } from "./config";
import { Locale } from "./locale";

export type ChannelClientInstallState = "INSTALLED" | "NOT_INSTALLED";

export interface ChannelClient {
  installState: () => ChannelClientInstallState;
  installDir: () => string;

  showPredownloadPrompt: () => boolean;
  updateRequired: () => boolean;
  predownloadVersion: () => string;

  uiContent: {
    background: string;
    url: string;
    iconImage?: string;
    launchButtonLocation?: "left" | "right";
    logo?: string;
  };

  dismissPredownload(): void;

  update(): CommonUpdateProgram;
  install(path: string): CommonUpdateProgram;
  predownload(): CommonUpdateProgram;
  launch(config: Config): CommonUpdateProgram;
  checkIntegrity(): CommonUpdateProgram;
  init(config: Config): CommonUpdateProgram;
  createConfig(
    locale: Locale,
    config: Partial<Config>,
  ): Promise<() => JSXElement>;
}
