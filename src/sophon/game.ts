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
    return {
      game: server.id,
      cn: server.id.endsWith("_cn"),
      directory: installDir(),
      transfer: {
        cacheDirectory: resolve("./sophon/transfers"),
        stateDirectory: resolve("./sophon/state"),
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
      setAction(await (await getSophonClient()).nextAction(parameters()));
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
      const client = await getSophonClient();
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
    activity: stats.activity,
    history: stats.history,
    action,
    error,
    loading,
    operationRunning,
    cancelling,
    installDir,
    selectDirectory,
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
    async *install(directory: string): CommonUpdateProgram {
      await selectDirectory(directory);
      yield* performAction();
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
    async *checkIntegrity(): CommonUpdateProgram {
      await refresh();
      const next = action();
      if (!next) throw new Error(error() || "Choose a game directory first");
      if (next.action === "resumeUpdate" && !next.cacheOnly) {
        if (!(yield* run("update", actionParameters(next)))) return;
      }
      const params = parameters();
      yield* run("install", {
        ...params,
        voicePacks: next.voicePacks,
        transfer: { ...params.transfer, preserveState: false },
      });
    },
  };
}

export type SophonGame = Awaited<ReturnType<typeof createSophonGame>>;
