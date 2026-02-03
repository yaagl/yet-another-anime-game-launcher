import {
  Button,
  Progress,
  ProgressIndicator,
  Center,
  Box,
  VStack,
  Image,
} from "./components/ui";
import { SpeedIndicator } from "./components/speed-indicators";
import { createSignal, onMount, Show } from "solid-js";
import { fatal, _safeRelaunch } from "./utils";
import { Locale, LocaleTextKey } from "./locale";
import { UPDATE_UI_IMAGE } from "./clients";

export function createCommonUpdateUI(
  locale: Locale,
  program: () => CommonUpdateProgram
) {
  let confirmRestart: (v: unknown) => void;
  const confirmRestartPromise = new Promise(res => {
    confirmRestart = res;
  });
  return function CommonUpdateUI() {
    const [progress, setProgress] = createSignal(0);
    const [statusText, setStatusText] = createSignal("");
    const [speedMetrics, setSpeedMetrics] = createSignal<{
      networkSpeed: string;
      diskSpeed: string;
      isDiskBottleneck: boolean;
    } | null>(null);
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
              setSpeedMetrics(null);
              break;
            case "setStateText":
              // Extract speed metrics if present (indices 3: networkSpeed, 4: diskSpeed)
              if (text[1] === "DOWNLOADING_FILE_PROGRESS" && text.length >= 5) {
                const networkSpeed = text[3] as string;
                const diskSpeed = text[4] as string;
                const isDiskBottleneck = text[5] === "true";

                setSpeedMetrics({
                  networkSpeed,
                  diskSpeed,
                  isDiskBottleneck,
                });
                // Only format the base progress text (filename, progress)
                setStatusText(locale.format(text[1], text.slice(2, 4)));
              } else {
                setStatusText(locale.format(text[1], text.slice(2)));
                setSpeedMetrics(null);
              }
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
          <div style="text-align: center">
            <h1>{statusText()}</h1>
            <Show when={speedMetrics()}>
              {(metrics) => (
                <div style="margin-top: 1rem">
                  <SpeedIndicator
                    networkSpeed={metrics().networkSpeed}
                    diskSpeed={metrics().diskSpeed}
                    isDiskBottleneck={metrics().isDiskBottleneck}
                    iconSize="md"
                  />
                </div>
              )}
            </Show>
          </div>
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
