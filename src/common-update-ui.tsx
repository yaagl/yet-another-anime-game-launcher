import { Button, Progress, ProgressIndicator, Center } from "@hope-ui/solid";
import { Box, VStack, Image } from "@hope-ui/solid";
import { createSignal, onMount, Show } from "solid-js";
import { fatal, _safeRelaunch } from "./utils";
import { Locale, LocaleTextKey } from "./locale";
import { UPDATE_UI_IMAGE } from "./clients";

export function createCommonUpdateUI(
  locale: Locale,
  program: () => CommonUpdateProgram,
) {
  let confirmRestart: (v: unknown) => void;
  const confirmRestartPromise = new Promise(res => {
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
              setStatusText(locale.format(text[1], text.slice(2)));
              break;
          }
        }
        setDone(true);
        await confirmRestartPromise;
        await _safeRelaunch();
      })()
        .then()
        .catch(fatal);
    });

    return (
      <Center h="100vh" w="100vw">
        <VStack alignItems="stretch" spacing="$8" w="80vw">
          <Center>
            <Image boxSize={280} src={UPDATE_UI_IMAGE}></Image>
          </Center>
          <h1 style="text-align: center">{statusText()}</h1>
          <Box height={100}>
            <Show
              when={!done()}
              fallback={
                <Center>
                  <Button onClick={confirmRestart}>
                    {locale.get("RESTART_TO_INSTALL")}
                  </Button>
                </Center>
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

export type CommonUpdateProgram<Ret = void> = AsyncGenerator<
  CommonProgressUICommand,
  Ret
>;

export type CommonProgressUICommand =
  | ["setProgress", number]
  | ["setStateText", LocaleTextKey, ...string[]]
  | ["setUndeterminedProgress"];
