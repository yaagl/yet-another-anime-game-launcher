import { CURRENT_YAAGL_VERSION } from "./constants";
import {
  addTerminationHook,
  getKeyOrDefault,
  GLOBAL_onClose,
  log,
  resolveResource,
  spawn,
} from "./utils";

export const UPDATE_CHANNEL_KEY = "config_updateChannel";
export const updateChannels = [
  { value: "stable", label: "Stable", channels: [] },
  { value: "rc", label: "Release candidate", channels: ["rc"] },
  { value: "beta", label: "Beta", channels: ["rc", "beta"] },
  { value: "alpha", label: "Alpha", channels: ["rc", "beta", "alpha"] },
  {
    value: "prerelease",
    label: "All prereleases",
    channels: ["rc", "beta", "alpha", "prerelease"],
  },
] as const;
export type UpdateChannel = (typeof updateChannels)[number]["value"];

export async function getUpdateChannel(): Promise<UpdateChannel> {
  const value = await getKeyOrDefault(UPDATE_CHANNEL_KEY, "stable");
  return (
    updateChannels.find(channel => channel.value === value)?.value ?? "stable"
  );
}

export async function createUpdater(parentPID: string) {
  let process: Pick<Neutralino.os.SpawnProcessResult, "id" | "pid"> | undefined;
  let pending = Promise.resolve();
  let quittingForUpdate = false;
  let userInitiated = false;
  let reportedError = false;
  let output = "";

  async function reportError(message: string, show = userInitiated) {
    await log(`Updater: ${message}`);
    if (show && !reportedError) {
      reportedError = true;
      await Neutralino.os.showMessageBox("Update error", message, "OK");
    }
  }

  async function stop() {
    const current = process;
    process = undefined;
    if (current)
      await Neutralino.os
        .updateSpawnedProcess(current.id, "exit")
        .catch(error => log(`Updater already stopped: ${error}`));
  }

  await Neutralino.events.on<Neutralino.os.SpawnProcessResult>(
    "spawnedProcess",
    async event => {
      if (!event || event.detail.id !== process?.id) return;
      const { action, data } = event.detail;
      if (action === "exit") {
        process = undefined;
        if (Number(data) !== 0 && !quittingForUpdate)
          await reportError(
            `Updater stopped unexpectedly (code ${data}). Check the launcher log for details.`
          );
        return;
      }
      if (action === "stdErr") {
        await log(`Updater: ${data}`);
        return;
      }
      if (action !== "stdOut") return;
      output += String(data);
      let newline: number;
      while ((newline = output.indexOf("\n")) >= 0) {
        const line = output.slice(0, newline);
        output = output.slice(newline + 1);
        let message: { event: string; message?: string };
        try {
          message = JSON.parse(line);
        } catch {
          continue;
        }
        if (!message || typeof message !== "object") continue;
        if (message.event === "error") {
          await reportError(message.message ?? "Could not start updater");
        } else if (message.event === "quit" && !quittingForUpdate) {
          quittingForUpdate = true;
          try {
            if (await GLOBAL_onClose(false)) {
              await Neutralino.app.exit(0);
            } else {
              quittingForUpdate = false;
              await stop();
            }
          } catch (error) {
            quittingForUpdate = false;
            await stop();
            await Neutralino.os.showMessageBox(
              "Update error",
              String(error),
              "OK"
            );
          }
        }
      }
    }
  );

  addTerminationHook(async () => {
    if (!quittingForUpdate) await stop();
    return true;
  });

  async function check(command: "check" | "background" | "configure") {
    const manual = command === "check";
    if (CURRENT_YAAGL_VERSION === "development") {
      if (manual)
        await Neutralino.os.showMessageBox(
          "Updates",
          "Automatic updates are disabled in development builds.",
          "OK"
        );
      return;
    }
    if (quittingForUpdate || (command === "configure" && !process)) return;
    if (command !== "configure") userInitiated = manual;
    const channel = await getUpdateChannel();
    if (!process) {
      output = "";
      reportedError = false;
      process = await spawn([
        resolveResource("../MacOS/yaagl-updater"),
        parentPID,
      ]);
    }
    const current = process;
    if (!current)
      throw new Error("Updater stopped before receiving the check request");
    const channels = (
      updateChannels.find(option => option.value === channel) ??
      updateChannels[0]
    ).channels;
    await Neutralino.os.updateSpawnedProcess(
      current.id,
      "stdIn",
      JSON.stringify({ command, channels }) + "\n"
    );
  }

  function request(command: "check" | "background" | "configure") {
    pending = pending
      .then(() => check(command))
      .catch(async error => {
        await stop();
        await reportError(String(error), command === "check");
      });
    return pending;
  }

  await Neutralino.events.on("updateChannelChanged", () =>
    request("configure")
  );
  return {
    checkForUpdates: () => request("check"),
    checkInBackground: () => request("background"),
  };
}
