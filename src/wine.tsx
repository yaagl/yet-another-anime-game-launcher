import { Aria2 } from "./aria2";
import { fatal, getKey, resolve, restart, setKey, tar_extract } from "./utils";

export async function createWine(options: { prefix: string }) {
  async function cmd(command: string, args: string[]) {}

  async function launch(program: string) {}

  return {};
}

export type Wine = ReturnType<typeof createWine> extends Promise<infer T>
  ? T
  : never;

export async function checkWine() {
  // TODO
  try {
    const wineState = await getKey("wine_state");
    if (wineState == "update") {
      return {
        wineReady: false,
        wineUpdate: await getKey("wine_update_target"),
      };
    }
    return { wineReady: true };
  } catch (e) {
    return { wineReady: false, wineUpdate: "FIXME_RECOMMENT_WINE" };
  }
}

export async function createWineInstallProgram({
  // github:
  aria2,
  wineUpdate,
}: {
  aria2: Aria2;
  wineUpdate: string;
}) {
  // await Neutralino.window.setSize({width:500, height:500,maxHeight:500, maxWidth:500,minHeight:500, minWidth:500})

  return function WineInstall() {
    return "TODO";
  };
}
