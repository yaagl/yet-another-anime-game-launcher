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
      <div
        class="w-screen h-screen flex items-center justify-center"
        style={{
          background: `
            linear-gradient(135deg, rgba(30, 58, 138, 0.8) 0%, rgba(79, 70, 229, 0.7) 25%, rgba(139, 92, 246, 0.6) 50%, rgba(88, 86, 214, 0.7) 75%, rgba(30, 58, 138, 0.8) 100%)
          `,
          "background-size": "400% 400%",
          animation: "gradientShift 15s ease infinite",
        }}
      >
        <style>
          {`
            @keyframes gradientShift {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
            }
            @keyframes pulse-glow {
              0%, 100% { 
                opacity: 0.8;
                filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.4));
              }
              50% { 
                opacity: 1;
                filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.6));
              }
            }
          `}
        </style>

        <VStack alignItems="stretch" spacing="$8" w="min(90vw, 600px)" class="relative z-10">
          {/* Logo/Character Image */}
          <Center>
            <div
              class="relative"
              style={{
                animation: "pulse-glow 3s ease-in-out infinite",
              }}
            >
              <div class="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-2xl opacity-30"></div>
              <div class="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
                <Image boxSize={280} src={UPDATE_UI_IMAGE} class="drop-shadow-lg" />
              </div>
            </div>
          </Center>

          {/* Status Text and Metrics */}
          <div class="bg-gradient-to-r from-black/40 to-black/20 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl">
            <div style="text-align: center">
              <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent mb-4 drop-shadow-lg">
                {statusText()}
              </h1>
              
              <Show when={speedMetrics()}>
                {(metrics) => (
                  <div style="margin-top: 1.5rem">
                    <SpeedIndicator
                      networkSpeed={metrics().networkSpeed}
                      diskSpeed={metrics().diskSpeed}
                      isDiskBottleneck={metrics().isDiskBottleneck}
                      iconSize="md"
                      class="justify-center"
                    />
                  </div>
                )}
              </Show>
            </div>
          </div>

          {/* Progress Bar */}
          <Box class="backdrop-blur-sm bg-white/5 rounded-2xl p-6 border border-white/10">
            <Show
              when={!done()}
              fallback={
                <Center>
                  <Button
                    onClick={confirmRestart}
                    class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {locale.get("RESTART_TO_INSTALL")}
                  </Button>
                </Center>
              }
            >
              <div>
                <div class="text-sm text-white/60 mb-3 font-semibold">
                  {Math.round(progress())}%
                </div>
                <Progress
                  value={progress()}
                  indeterminate={progress() == 0}
                  class="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-full overflow-hidden"
                >
                  <ProgressIndicator
                    animated
                    striped
                    class="bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg shadow-blue-500/30"
                  />
                </Progress>
              </div>
            </Show>
          </Box>
        </VStack>
      </div>
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
