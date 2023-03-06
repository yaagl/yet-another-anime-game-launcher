import { Button, Progress, ProgressIndicator, Center } from "@hope-ui/solid";
import { Box, VStack } from "@hope-ui/solid";
import { createSignal, onMount, Show } from "solid-js";
import { fatal, log, shutdown } from "./utils";

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
        Neutralino.app.restartProcess();
      })()
        .then()
        .catch(fatal);
    });

    return (
      <Center h="100vh" w="100vw">
        <VStack alignItems="stretch" spacing="$8" w="80vw">
          <Box bg="transparent" h="40vh" w="100%"></Box>
          <h1 style="text-align: center">{statusText()}</h1>
          <Show
            when={!done()}
            fallback={<Button onClick={confirmRestart!}>重启以完成安装</Button>}
          >
            <Progress value={progress()} indeterminate={progress() == 0}>
              <ProgressIndicator animated striped />
            </Progress>
          </Show>
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
