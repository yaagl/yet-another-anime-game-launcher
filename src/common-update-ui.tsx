import { Button, Progress, ProgressIndicator, Center } from "@hope-ui/solid";
import { Box, VStack, Image } from "@hope-ui/solid";
import { createSignal, onMount, Show } from "solid-js";
import { fatal, log, shutdown, wait } from "./utils";
import s from "./assets/Nahida.cr.png";
import { Locale, LocaleTextKey } from "./locale";

export function createCommonUpdateUI(
  locale: Locale,
  program: () => CommonUpdateProgram
) {
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
              setStatusText(locale.format(text[1], text.slice(2)));
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
                <Center>
                  <Button onClick={confirmRestart!}>{locale.get("RESTART_TO_INSTALL")}</Button>
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

export type CommonUpdateProgram = AsyncGenerator<CommonProgressUICommand, void>;

export type CommonProgressUICommand =
  | ["setProgress", number]
  | ["setStateText", LocaleTextKey, ...string[]]
  | ["setUndeterminedProgress"];
