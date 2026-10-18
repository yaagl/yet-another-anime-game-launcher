import { createSignal } from "solid-js";
import { join } from "path-browserify";
import {
  GameAction,
  OperationParameters,
  OperationProgress,
  OperationProgressSnapshot,
  OperationStatus,
  SophonRpcClient,
} from "@sophon-rpc";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import { Locale } from "@locale";
import {
  fileOrDirExists,
  getKeyOrDefault,
  mkdirp,
  readFile,
  resolve,
  setKey,
  writeFile,
} from "@utils";
import { getSophonClient } from "./client";
import { gameConfigDefaults } from "./config";
import { progressCommands } from "./progress";
import { createSophonActivity } from "./activity";
import {
  createSophonSettings,
  SophonSettings,
  sophonSettingsError,
} from "./settings";
import { getInstallOptions, InstallSelection } from "./install-options";

export function canPlay(action: GameAction | undefined): boolean {
  return (
    action?.action === "none" ||
    action?.action === "cacheUpdate" ||
    (action?.action === "resumeUpdate" &&
      action.cacheOnly &&
      action.predownload)
  );
}

export async function createSophonGame(server: Server, locale: Locale) {
  const downloader = await createSophonSettings();
  const [installDir, setInstallDir] = createSignal(
    await getKeyOrDefault("game_install_dir", "")
  );
  const [action, setAction] = createSignal<GameAction>();
  const [loading, setLoading] = createSignal(Boolean(installDir()));
  const [error, setError] = createSignal("");
  const [dismissed, setDismissed] = createSignal(false);
  const [operationRunning, setOperationRunning] = createSignal(false);
  const [cancelling, setCancelling] = createSignal(false);
  const stats = createSophonActivity();
  let activeClient: SophonRpcClient | undefined;
  let operationID: string | undefined;

  function parameters(): OperationParameters {
    const settings = downloader.settings();
    return {
      game: server.id,
      cn: server.id.endsWith("_cn"),
      directory: installDir(),
      downloads: settings.downloads,
      writes: settings.writes,
      checks: settings.checks,
      postProcessors: settings.postProcessors,
      maxRetries: settings.maxRetries,
      retryInterval: settings.retryInterval,
      maxCachedFileHandles: settings.maxCachedFileHandles,
      transfer: {
        cacheDirectory: resolve("./sophon/transfers"),
        stateDirectory: resolve("./sophon/state"),
        predownloadDirectory: settings.predownloadDirectory || undefined,
        memoryLimit: settings.memoryMiB * 1024 ** 2,
        diskLimit: settings.diskGiB * 1024 ** 3,
        diskCacheEnabled: settings.diskCacheEnabled,
        entryLimit: settings.entryLimit,
        ioPolicy: settings.ioPolicy,
        writeMode: settings.writeMode,
        preserveState: settings.preserveState,
      },
    };
  }

  async function refresh() {
    setAction(undefined);
    if (!installDir()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const client = await getSophonClient(downloader.settings().debugLogging);
      setAction(await client.nextAction(parameters()));
    } catch (error) {
      setError(String(error));
    } finally {
      setLoading(false);
    }
  }

  async function selectDirectory(directory: string) {
    if (operationRunning())
      throw new Error("A game operation is still running");
    await setKey("game_install_dir", directory);
    setInstallDir(directory);
    setDismissed(false);
    await refresh();
  }

  async function* run(
    kind: "install" | "update",
    params: OperationParameters
  ): CommonUpdateProgram<boolean> {
    if (operationRunning())
      throw new Error("A game operation is still running");
    setOperationRunning(true);
    setCancelling(false);
    stats.start(kind, params, action()?.targetVersion);
    let unsubscribe: (() => void) | undefined;
    let wake: (() => void) | undefined;
    let latest: OperationProgress | undefined;
    let early: OperationProgressSnapshot | undefined;
    let result: OperationStatus | undefined;
    let failure: unknown;
    let settled = false;
    try {
      yield ["setUndeterminedProgress"];
      yield ["setStateText", "CHECKING_GAME"];
      if (kind === "install") {
        await mkdirp(params.directory);
        const file = join(params.directory, "config.ini");
        const contents = (await fileOrDirExists(file))
          ? await readFile(file)
          : "";
        const updated = gameConfigDefaults(contents, server);
        if (updated !== contents) await writeFile(file, updated);
      }
      const client = await getSophonClient(downloader.settings().debugLogging);
      activeClient = client;
      unsubscribe = client.onProgress(snapshot => {
        if (!operationID) early = snapshot;
        else if (snapshot.operationID === operationID) {
          if (settled) return;
          latest = snapshot.progress;
          stats.record(snapshot);
          wake?.();
        }
      });
      operationID = (await client[kind](params)).operationID;
      stats.record({ operationID, status: "running" });
      if (early?.operationID === operationID) {
        latest = early.progress;
        stats.record(early);
      }
      if (cancelling()) await client.cancel(operationID);
      const completion = client.wait(operationID).then(
        status => {
          result = status;
          stats.record(status);
          latest = status.progress ?? latest;
          settled = true;
          wake?.();
        },
        error => {
          failure = error;
          settled = true;
          wake?.();
        }
      );
      while (!settled || latest) {
        if (latest) {
          const snapshot = latest;
          latest = undefined;
          for (const command of progressCommands(snapshot, locale))
            yield command;
        } else if (!settled) {
          await new Promise<void>(resolve => {
            wake = resolve;
          });
        }
      }
      await completion;
      if (failure) throw failure;
      if (result?.status === "cancelled") return false;
      if (result?.status !== "completed") {
        throw new Error(result?.error ?? "The game operation did not complete");
      }
      yield ["setProgress", 100];
      yield ["setStateText", "INSTALL_DONE"];
      return true;
    } catch (error) {
      stats.fail(error);
      throw error;
    } finally {
      unsubscribe?.();
      activeClient = undefined;
      operationID = undefined;
      await refresh();
      setOperationRunning(false);
      setCancelling(false);
    }
  }

  function actionParameters(next: GameAction): OperationParameters {
    return {
      ...parameters(),
      sourceVersion: next.sourceVersion ?? undefined,
      predownload: next.predownload,
      cacheOnly: next.cacheOnly,
      mode: next.mode === "CATEGORY_SCENARIO_BASE" ? "base" : "full",
      voicePacks: next.voicePacks,
    };
  }

  async function* performAction(predownload = false): CommonUpdateProgram {
    if (operationRunning()) return;
    await refresh();
    const next = action();
    if (!next) {
      if (error()) throw new Error(error());
      return;
    }
    const futureCache = next.cacheOnly && next.predownload;
    if (next.action === "none" || futureCache !== predownload) return;
    yield* run(
      next.action === "install" || next.action === "resumeInstall"
        ? "install"
        : "update",
      actionParameters(next)
    );
  }

  return {
    settings: downloader.settings,
    async saveSettings(settings: SophonSettings) {
      if (operationRunning() || loading())
        throw new Error(
          "Wait for the current game operation to finish before changing settings."
        );
      const error = sophonSettingsError(settings);
      if (error) throw new Error(error);
      setLoading(true);
      try {
        if (settings.debugLogging !== downloader.settings().debugLogging)
          await getSophonClient(settings.debugLogging);
        await downloader.save(settings);
      } finally {
        setLoading(false);
      }
    },
    activity: stats.activity,
    history: stats.history,
    action,
    error,
    loading,
    operationRunning,
    cancelling,
    installDir,
    selectDirectory,
    async installOptions() {
      const client = await getSophonClient(downloader.settings().debugLogging);
      return getInstallOptions(client, {
        game: server.id,
        cn: server.id.endsWith("_cn"),
      });
    },
    refresh,
    performAction,
    gameVersion: () => action()?.sourceVersion ?? "—",
    installState: (): "INSTALLED" | "NOT_INSTALLED" =>
      action()?.sourceVersion ? "INSTALLED" : "NOT_INSTALLED",
    updateRequired: () => !canPlay(action()),
    showPredownloadPrompt: () =>
      Boolean(action()?.cacheOnly && action()?.predownload) &&
      !dismissed() &&
      !operationRunning(),
    predownloadVersion: () =>
      action()?.cacheOnly ? action()?.targetVersion ?? "" : "",
    dismissPredownload: () => setDismissed(true),
    async *install(
      directory: string,
      selection?: InstallSelection
    ): CommonUpdateProgram {
      await selectDirectory(directory);
      if (error()) throw new Error(error());
      const next = action();
      if (
        selection &&
        next?.action !== "resumeInstall" &&
        !(next?.action === "resumeUpdate" && !next.cacheOnly)
      ) {
        yield* run("install", { ...parameters(), ...selection });
      } else {
        yield* performAction();
      }
    },
    update: () => performAction(),
    predownload: () => performAction(true),
    async cancel() {
      setCancelling(true);
      try {
        if (operationID) await activeClient?.cancel(operationID);
      } catch (error) {
        setCancelling(false);
        throw error;
      }
    },
    async canLaunch() {
      if (!operationRunning()) await refresh();
      return canPlay(action());
    },
    async *checkIntegrity(selection?: InstallSelection): CommonUpdateProgram {
      await refresh();
      const next = action();
      if (!next) throw new Error(error() || "Choose a game directory first");
      if (next.action === "resumeUpdate" && !next.cacheOnly) {
        if (!(yield* run("update", actionParameters(next)))) return;
      }
      const params = parameters();
      yield* run("install", {
        ...params,
        mode: selection?.mode ?? "full",
        voicePacks: [
          ...new Set([...next.voicePacks, ...(selection?.voicePacks ?? [])]),
        ],
        transfer: { ...params.transfer, preserveState: false },
      });
    },
  };
}

export type SophonGame = Awaited<ReturnType<typeof createSophonGame>>;
