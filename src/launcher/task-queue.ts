import { CommonUpdateProgram } from "@common-update-ui";
import { Locale } from "@locale";
import { fatal } from "@utils";
import { createSignal } from "solid-js";

export function createTaskQueueState({
  locale,
  onError,
}: {
  locale: Locale;
  onError?: (error: unknown) => Promise<void>;
}) {
  const [statusText, setStatusText] = createSignal("");
  const [progress, setProgress] = createSignal(0);
  const [programBusy, setBusy] = createSignal(false);

  const taskQueue: AsyncGenerator<unknown, void, () => CommonUpdateProgram> =
    (async function* () {
      while (true) {
        const task = yield 0;
        setBusy(true);
        try {
          for await (const text of task()) {
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
              case "setStatusText":
                setStatusText(text[1]);
                break;
            }
          }
        } catch (e) {
          if (onError) await onError(e);
          else {
            await fatal(e);
            return;
          }
        } finally {
          setBusy(false);
        }
      }
    })();
  taskQueue.next(); // ignored anyway

  return [statusText, progress, programBusy, taskQueue] as const;
}
