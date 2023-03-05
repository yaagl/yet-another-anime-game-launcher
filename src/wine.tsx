import {
  Box,
  Button,
  Center,
  Progress,
  ProgressIndicator,
  VStack,
} from "@hope-ui/solid";
import { createSignal, onMount, Show } from "solid-js";
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
    const [] = createSignal("");
    const [] = createSignal(0);

    let confirmRestart: (v: any) => void;
    const confirmRestartPromise = new Promise((res) => {
      confirmRestart = res;
    });

    async function main() {
      const download_file = await resolve("./wine.tar.gz");
      const wine_dst = await resolve("./wine");
      // download

      // install (untar/unzip)
      await tar_extract(download_file, wine_dst);

      // setState complete

      await setKey("wine_state", "ready");
      await confirmRestartPromise;
    }

    onMount(() => {
      main().then(restart).catch(fatal);
    });

    return (
      <Center h="100vh" w="100vw">
        <VStack alignItems="stretch" spacing="$8" w="80vw">
          <Box bg="transparent" h="40vh" w="100%"></Box>
          <h1 style="text-align: center">更新中</h1>
          <Show
            when={true}
            fallback={<Button onClick={confirmRestart!}>重启以完成安装</Button>}
          >
            <Progress value={10}>
              <ProgressIndicator animated striped />
            </Progress>
          </Show>
        </VStack>
      </Center>
    );
  };
}
