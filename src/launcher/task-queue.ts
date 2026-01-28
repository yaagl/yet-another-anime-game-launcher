import { CommonUpdateProgram } from "@common-update-ui";
import { Locale } from "@locale";
import { fatal, alert } from "@utils";
import { logError } from "../utils/structured-logging";
import { createSignal } from "solid-js";

export function createTaskQueueState({ locale }: { locale: Locale }) {
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
            }
          }
        } catch (e) {
          // Check if error is recoverable
          const errorMessage = e instanceof Error ? e.message : String(e);
          const isRecoverableError = 
            errorMessage.includes("not empty") ||
            errorMessage.includes("ENOTEMPTY") ||
            errorMessage.includes("directory is not empty");

          if (isRecoverableError) {
            // Show error but don't close app
            await logError("Recoverable installation error", e, {
              operation: "game installation",
              recoverable: true,
            });
            
            await alert(
              "Installation Error",
              `Cannot proceed: ${errorMessage}\n\nPlease ensure the installation directory is empty or choose a different location.`
            );
            
            // Reset state and allow user to try again
            setBusy(false);
            setStatusText("");
            setProgress(0);
            continue; // Continue loop instead of returning
          }

          // For other errors, still call fatal
          await fatal(e);
          return;
        }
        setBusy(false);
      }
    })();
  taskQueue.next(); // ignored anyway

  return [statusText, progress, programBusy, taskQueue] as const;
}
