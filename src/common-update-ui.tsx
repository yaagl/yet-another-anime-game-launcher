import { Button, Progress, ProgressIndicator, Center } from "@hope-ui/solid";
import { Box, VStack, Image } from "@hope-ui/solid";
import { createSignal, onMount, Show } from "solid-js";
import { fatal, log, shutdown, wait } from "./utils";
import s from "./assets/Nahida.cr.png";

export function createCommonUpdateUI(program: () => CommonUpdateProgram) {
  let confirmRestart: (v: any) => void;
  const confirmRestartPromise = new Promise((res) => {
    confirmRestart = res;
  });
  return function CommonUpdateUI() {
    const [progress, setProgress] = createSignal(0);
    const [statusText, setStatusText] = createSignal("");
    const [done, setDone] = createSignal(false);

    onMount(() => {
      (async () => {
        for await (const text of program()) {
          switch (text[0]) {
            case "setProgress":
              setProgress(text[1]);
              break;
            case "setUndeterminedProgress":
              setProgress(0);
              break;
            case "setStateText":
              setStatusText(text[1]); //FIXME: locales
              break;
          }
        }
        setDone(true);
        await confirmRestartPromise;
        await shutdown();
        // await wait(1000);
        // HACK
        if (import.meta.env.PROD) {
          const app = await Neutralino.os.getEnv("PATH_LAUNCH");
          await Neutralino.os.execCommand(`open "${app}"`, {
            background: true,
          });
          Neutralino.app.exit(0);
        } else {
          Neutralino.app.restartProcess();
        }
      })()
        .then()
        .catch(fatal);
    });

    return (
      <Center h="100vh" w="100vw">
        <VStack alignItems="stretch" spacing="$8" w="80vw">
          <Center>
            <Image boxSize={280} src={s}></Image>
          </Center>
          <h1 style="text-align: center">{statusText()}</h1>
          <Box height={100}>
            <Show
              when={!done()}
              fallback={
                <Center><Button onClick={confirmRestart!}>重启以完成安装</Button></Center>
              }
            >
              <Progress value={progress()} indeterminate={progress() == 0}>
                <ProgressIndicator animated striped />
              </Progress>
            </Show>
          </Box>
        </VStack>
      </Center>
    );
  };
}

export type CommonUpdateProgram = AsyncGenerator<CommonProgressUICommand, void>;

export type CommonProgressUICommand =
  | ["setProgress", number]
  | ["setStateText", string, ...string[]]
  | ["setUndeterminedProgress"];
