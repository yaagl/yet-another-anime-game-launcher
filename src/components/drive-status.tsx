/**
 * Drive status monitoring UI component
 * Displays alerts when external HDDs disconnect and provides recovery options
 */

import { Show, createSignal } from "solid-js";
import { Dialog, Button } from "./ui";
import { useDriveMonitor } from "../utils/drive-monitor";
import { Locale } from "../locale";
import { log } from "../utils";

export interface DriveStatusProps {
  /** Absolute path to game installation directory */
  gamePath: string;
  /** Locale instance for translations */
  locale: Locale;
  /** Callback when user wants to retry connection */
  onRetry?: () => Promise<void>;
  /** Callback when user cancels (stops operations) */
  onCancel?: () => void;
  /** Callback to select new game directory */
  onSelectNewPath?: () => Promise<string | null>;
  /** Child content to show when drive is accessible */
  children?: any;
}

/**
 * Drive status component - monitors external drive and shows disconnection alerts
 */
export function DriveStatus(props: DriveStatusProps) {
  const { isAccessible, lastError, volumeName, forceCheck, cleanup } =
    useDriveMonitor(props.gamePath);

  const [isRetrying, setIsRetrying] = createSignal(false);
  const [dialogOpen, setDialogOpen] = createSignal(!isAccessible());

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await forceCheck();
      if (isAccessible()) {
        setDialogOpen(false);
        if (props.onRetry) {
          await props.onRetry();
        }
      }
    } catch (error) {
      await log(`DriveStatus retry error: ${error}`);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    cleanup();
    if (props.onCancel) {
      props.onCancel();
    }
  };

  const handleSelectNewPath = async () => {
    if (!props.onSelectNewPath) return;

    try {
      const newPath = await props.onSelectNewPath();
      if (newPath) {
        setDialogOpen(false);
        cleanup();
      }
    } catch (error) {
      await log(`DriveStatus select path error: ${error}`);
    }
  };

  return (
    <>
      {props.children}

      <Dialog open={!isAccessible() && dialogOpen()} onOpenChange={setDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay class="fixed inset-0 bg-black/50 z-40" />
          <div class="fixed inset-0 flex items-center justify-center z-50">
            <Dialog.Content class="bg-white rounded-lg shadow-xl p-6 max-w-md">
              <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                  <Dialog.Title class="text-xl font-bold text-red-600">
                      {`External Drive Disconnected`}
                  </Dialog.Title>
                  <Dialog.Description class="text-sm text-gray-600 mt-1">
                    {`The drive "${volumeName()}" is no longer accessible. Please reconnect it or select a different location.`}
                  </Dialog.Description>
                </div>
              </div>

              <Show when={lastError()}>
                <div class="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded">
                  <p class="text-sm text-red-700">{lastError()}</p>
                </div>
              </Show>

              <div class="bg-gray-50 p-3 rounded mb-4">
                <p class="text-xs text-gray-500 mb-1">Game path:</p>
                <p class="text-sm font-mono text-gray-700 truncate">
                  {props.gamePath}
                </p>
              </div>

              <div class="bg-blue-50 border-l-4 border-blue-500 p-3 mb-6 rounded">
                <p class="text-sm text-blue-700">
                  Please reconnect the external drive and click "Retry" to continue.
                </p>
              </div>

              <div class="flex flex-col gap-3">
                <Button
                  onClick={handleRetry}
                  disabled={isRetrying()}
                  class="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isRetrying() ? "Retrying..." : "Retry Connection"}
                </Button>

                <Show when={props.onSelectNewPath}>
                  <Button
                    onClick={handleSelectNewPath}
                    disabled={isRetrying()}
                    variant="outlined"
                    class="w-full border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Select Different Location
                  </Button>
                </Show>

                <Button
                  onClick={handleCancel}
                  disabled={isRetrying()}
                  variant="text"
                  class="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel Operation
                </Button>
              </div>

              <Show when={isAccessible()}>
                <div class="mt-4 p-3 bg-green-50 border-l-4 border-green-500 rounded">
                  <p class="text-sm text-green-700 font-semibold">
                    Drive reconnected successfully!
                  </p>
                </div>
              </Show>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </Dialog>
    </>
  );
}
