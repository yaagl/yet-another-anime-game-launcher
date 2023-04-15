import { CommonUpdateProgram } from "../common-update-ui";
import { Config } from "./config";

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
    iconImage: string;
  };

  dismissPredownload(): void;

  update(): CommonUpdateProgram;
  install(path: string): CommonUpdateProgram;
  predownload(): CommonUpdateProgram;
  launch(config: Config): CommonUpdateProgram;
  checkIntegrity(): CommonUpdateProgram;
  init(config: Config): CommonUpdateProgram;
}
