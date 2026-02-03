import { CommonUpdateProgram } from "@common-update-ui";
import { Locale } from "@locale";
import { fatal, alert } from "@utils";
import { logError } from "../utils/structured-logging";
import {
  isFileNotFoundError,
  isPermissionError,
} from "../utils/external-drive";
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
          // Check error type to determine if recoverable
          const errorMessage = e instanceof Error ? e.message : String(e);
          
          // Categorize error types
          const isFileNotFound = isFileNotFoundError(e);
          const isPermissionDenied = isPermissionError(e);
          const isEmptyDirError = errorMessage.includes("not empty") ||
            errorMessage.includes("ENOTEMPTY") ||
            errorMessage.includes("directory is not empty");

          // External drive disconnection or file not found - likely external HDD issue
          if (isFileNotFound) {
            await logError("External drive disconnected", e, {
              operation: "game install/launch/repair",
              errorType: "file_not_found",
              recoverable: true,
            });

            await alert(
              "External Drive Disconnected",
              `The game installation directory is no longer accessible.\n\n` +
                `This typically means your external hard drive has been disconnected.\n\n` +
                `Please:\n` +
                `1. Reconnect your external hard drive\n` +
                `2. Click Retry to resume the operation\n` +
                `3. Or select a different game directory\n\n` +
                `Error: ${errorMessage}`
            );

            setBusy(false);
            setStatusText("");
            setProgress(0);
            continue; // Allow retry
          }

          // Permission denied - likely permission issue not HDD disconnect
          if (isPermissionDenied) {
            await logError("Permission denied during operation", e, {
              operation: "game install/launch/repair",
              errorType: "permission_denied",
              recoverable: true,
            });

            await alert(
              "Permission Denied",
              `Cannot access the game installation directory.\n\n` +
                `This may be a permissions issue. Please verify:\n` +
                `1. You have read/write access to the directory\n` +
                `2. The directory is not write-protected\n` +
                `3. No other process is locking files\n\n` +
                `Error: ${errorMessage}`
            );

            setBusy(false);
            setStatusText("");
            setProgress(0);
            continue; // Allow retry
          }

          // Directory not empty errors
          if (isEmptyDirError) {
            await logError("Directory not empty error", e, {
              operation: "game installation",
              errorType: "dir_not_empty",
              recoverable: true,
            });

            await alert(
              "Directory Not Empty",
              `Cannot proceed: The installation directory is not empty.\n\n` +
                `Please ensure the installation directory is empty or choose a different location.`
            );

            setBusy(false);
            setStatusText("");
            setProgress(0);
            continue; // Allow retry with different directory
          }

          // Unknown error - fatal
          await logError("Fatal operation error", e, {
            operation: "game install/launch/repair",
            errorType: "unknown",
            recoverable: false,
          });
          await fatal(e);
          return;
        }
        setBusy(false);
      }
    })();
  taskQueue.next(); // ignored anyway

  return [statusText, progress, programBusy, taskQueue] as const;
}
