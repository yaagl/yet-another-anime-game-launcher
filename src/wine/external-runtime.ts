import { build } from "../utils/command-builder";
import { WineDistribution } from "./distro";
import { ExternalWineRunner } from "./wine";
import { createRuntimeSession } from "./runtime-session";

export interface ExternalRuntimeConfig {
  version: 1;
  prefix: string;
  command: string[];
  distribution: WineDistribution;
  ownsGraphicsLibraries: boolean;
  ownerPidEnvironment: string;
}

export function parseExternalRuntimeConfig(
  value: unknown
): ExternalRuntimeConfig {
  const config = value as Partial<ExternalRuntimeConfig> | null;
  if (
    !config ||
    config.version !== 1 ||
    typeof config.prefix !== "string" ||
    !config.prefix.startsWith("/") ||
    !Array.isArray(config.command) ||
    !config.command.length ||
    !config.command.every(x => typeof x === "string" && x.length > 0) ||
    !config.command[0].startsWith("/") ||
    typeof config.ownsGraphicsLibraries !== "boolean" ||
    typeof config.ownerPidEnvironment !== "string" ||
    !/^[A-Za-z_][A-Za-z0-9_]*$/.test(config.ownerPidEnvironment) ||
    typeof config.distribution?.id !== "string" ||
    !config.distribution.id ||
    typeof config.distribution.displayName !== "string" ||
    !config.distribution.displayName ||
    typeof config.distribution.remoteUrl !== "string" ||
    !config.distribution.attributes ||
    typeof config.distribution.attributes !== "object"
  ) {
    throw new Error("Invalid external Wine runtime configuration");
  }
  return config as ExternalRuntimeConfig;
}

/** Opt-in provider; the normal Wine installation path remains the default. */
export async function loadExternalRuntime() {
  const path = await Neutralino.os.getEnv("YAAGL_EXTERNAL_RUNTIME_CONFIG");
  if (!path) return undefined;
  const client = import.meta.env.YAAGL_CHANNEL_CLIENT ?? "hk4ecn";
  if (client !== "hk4ecn" && client !== "hk4eos") {
    throw new Error("External Wine runtimes currently support HK4E CN/OS only");
  }
  if (!path.startsWith("/"))
    throw new Error("Runtime config path must be absolute");
  const config = parseExternalRuntimeConfig(
    JSON.parse(await Neutralino.filesystem.readFile(path))
  );
  const owner = await Neutralino.os.getEnv(config.ownerPidEnvironment);
  if (!/^[1-9][0-9]*$/.test(owner))
    throw new Error("Missing runtime owner PID");
  async function invoke(args: string[]) {
    const result = await Neutralino.os.execCommand(
      build([...config.command, ...args]),
      {}
    );
    if (result.exitCode !== 0) throw new Error(result.stdErr || result.stdOut);
    return result;
  }
  const session = createRuntimeSession({
    async prepare() {
      const result = JSON.parse((await invoke(["prepare", owner])).stdOut);
      if (typeof result.id !== "string" || !result.id) {
        throw new Error("External runtime returned no recovery session ID");
      }
      return result.id;
    },
    requestStop: () => invoke(["request-stop"]),
    finish: id => invoke(["finish", id]),
  });
  const runner: ExternalWineRunner = {
    exec: (program, args, env, logFile) =>
      invoke(["exec", JSON.stringify({ program, args, env, logFile })]),
    waitUntilServerOff: () => invoke(["wait"]),
    ownsGraphicsLibraries: config.ownsGraphicsLibraries,
    displayName: config.distribution.displayName,
    runSession: session.run,
  };
  return {
    prefix: config.prefix,
    distribution: config.distribution,
    runner,
    recover: () => invoke(["recover"]),
    async getDownloadPort() {
      const port = JSON.parse((await invoke(["download-port"])).stdOut).port;
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(
          "External runtime returned an invalid download RPC port"
        );
      }
      return port as number;
    },
    close: session.close,
  };
}
