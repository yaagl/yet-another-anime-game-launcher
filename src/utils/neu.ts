import { join } from "path-browserify";
import { build, CommandSegments, rawString } from "./command-builder";

export interface ExecOptions {
  phase?: string;
  logFile?: string;
  teeOutput?: boolean;
  debug?: boolean;
  allowFailure?: boolean;
}

export interface ExecResultDetails extends Neutralino.os.ExecCommandResult {
  command: string;
  phase?: string;
  logFile?: string;
  cwd: string;
  envDiff: string;
  startedAt: string;
  endedAt: string;
}

type ExecOptionsInput = boolean | ExecOptions | undefined;
type LogRedirectInput = string | ExecOptions | undefined;

const STDIO_SUMMARY_LIMIT = 4000;

export function resolve(path: string): string {
  if (!path.startsWith("/")) {
    path = join(
      import.meta.env.PROD
        ? window.NL_PATH
        : join(window.NL_CWD, window.NL_PATH),
      path
    );
    // await Neutralino.os.showMessageBox("1", command, "OK");
    if (!path.startsWith("/") || path == "/")
      throw new Error("Assertation failed " + path);
  }
  return path;
}

export async function exec(
  segments: CommandSegments,
  env?: { [key: string]: string },
  sudoOrOptions: ExecOptionsInput = false,
  logRedirectOrOptions: LogRedirectInput = undefined
): Promise<ExecResultDetails> {
  const { sudo, options } = normalizeExecOptions(
    sudoOrOptions,
    logRedirectOrOptions
  );
  const cmd = buildExecCommand(segments, env, options);
  const startedAt = new Date().toISOString();
  const cwd = getExecutionCwd();
  const envDiff = formatEnvDiff(env);
  await log(sudo ? runInSudo(cmd) : cmd);
  await writeExecTrace(options, {
    status: "start",
    command: cmd,
    cwd,
    envDiff,
    startedAt,
  });
  const ret = await Neutralino.os.execCommand(sudo ? runInSudo(cmd) : cmd, {});
  const endedAt = new Date().toISOString();
  const detailedRet: ExecResultDetails = {
    ...ret,
    command: cmd,
    phase: options.phase,
    logFile: options.logFile,
    cwd,
    envDiff,
    startedAt,
    endedAt,
  };
  await writeExecTrace(options, {
    status: "end",
    command: cmd,
    cwd,
    envDiff,
    startedAt,
    endedAt,
    exitCode: ret.exitCode,
    stdOut: ret.stdOut,
    stdErr: ret.stdErr,
  });
  if (ret.exitCode != 0) {
    if (options.allowFailure) return detailedRet;
    throw new Error(formatExecFailure(detailedRet));
  }
  return detailedRet;
}

export async function exec2(
  segments: CommandSegments,
  env?: { [key: string]: string },
  sudoOrOptions: ExecOptionsInput = false,
  logRedirectOrOptions: LogRedirectInput = undefined
): Promise<ExecResultDetails> {
  const { sudo, options } = normalizeExecOptions(
    sudoOrOptions,
    logRedirectOrOptions
  );
  const cmd = buildExecCommand(segments, env, options);
  const startedAt = new Date().toISOString();
  const cwd = getExecutionCwd();
  const envDiff = formatEnvDiff(env);
  await log(sudo ? runInSudo(cmd) : cmd);
  await writeExecTrace(options, {
    status: "start",
    command: cmd,
    cwd,
    envDiff,
    startedAt,
  });
  const { id, pid } = await Neutralino.os.spawnProcess(
    sudo ? runInSudo(cmd) : cmd
  );
  return await new Promise((res, rej) => {
    let stdErr = "",
      stdOut = "";
    const handler: Neutralino.events.Handler<
      Neutralino.os.SpawnProcessResult
    > = async event => {
      if (!event) return;
      if (event.detail.id == id) {
        if (event.detail["action"] == "exit") {
          const exit = Number(event.detail["data"]);
          const endedAt = new Date().toISOString();
          const detailedRet: ExecResultDetails = {
            pid,
            exitCode: exit,
            stdErr,
            stdOut,
            command: cmd,
            phase: options.phase,
            logFile: options.logFile,
            cwd,
            envDiff,
            startedAt,
            endedAt,
          };
          await writeExecTrace(options, {
            status: "end",
            command: cmd,
            cwd,
            envDiff,
            startedAt,
            endedAt,
            exitCode: exit,
            pid,
            stdOut,
            stdErr,
          });
          if (exit == 0 || options.allowFailure) {
            res(detailedRet);
          } else {
            rej(new Error(formatExecFailure(detailedRet)));
          }

          Neutralino.events.off("spawnedProcess", handler);
        } else if (event.detail["action"] == "stdOut") {
          stdOut += event.detail["data"];
        } else if (event.detail["action"] == "stdErr") {
          stdErr += event.detail["data"];
        }
      }
    };
    Neutralino.events.on("spawnedProcess", handler);
  });
}

export function buildExecCommand(
  segments: CommandSegments,
  env?: { [key: string]: string },
  options: ExecOptions = {}
): string {
  const shouldRedirect = options.logFile && !options.teeOutput;
  return build(
    [
      ...segments,
      ...(shouldRedirect ? [rawString("&>"), options.logFile as string] : []),
    ],
    env
  );
}

export function formatExecFailure(ret: ExecResultDetails): string {
  return [
    `Command return non-zero code (${ret.exitCode})`,
    ret.phase ? `Phase: ${ret.phase}` : undefined,
    `Command: ${ret.command}`,
    `Cwd: ${ret.cwd}`,
    `EnvDiff: ${ret.envDiff}`,
    ret.logFile ? `LogFile: ${ret.logFile}` : undefined,
    ret.pid != null ? `Pid: ${ret.pid}` : undefined,
    `StartedAt: ${ret.startedAt}`,
    `EndedAt: ${ret.endedAt}`,
    `StdOut:\n${summarizeText(ret.stdOut)}`,
    `StdErr:\n${summarizeText(ret.stdErr)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function summarizeText(value: string): string {
  if (value.length <= STDIO_SUMMARY_LIMIT) return value;
  return `${value.slice(0, STDIO_SUMMARY_LIMIT)}\n...[truncated ${
    value.length - STDIO_SUMMARY_LIMIT
  } chars]`;
}

function normalizeExecOptions(
  sudoOrOptions: ExecOptionsInput,
  logRedirectOrOptions: LogRedirectInput
): { sudo: boolean; options: ExecOptions } {
  const sudo = typeof sudoOrOptions == "boolean" ? sudoOrOptions : false;
  const options =
    typeof sudoOrOptions == "object"
      ? sudoOrOptions
      : typeof logRedirectOrOptions == "object"
      ? logRedirectOrOptions
      : {};
  if (typeof logRedirectOrOptions == "string") {
    return {
      sudo,
      options: {
        ...options,
        logFile: logRedirectOrOptions,
      },
    };
  }
  return { sudo, options };
}

async function writeExecTrace(
  options: ExecOptions,
  event: {
    status: "start" | "end";
    command: string;
    cwd: string;
    envDiff: string;
    startedAt: string;
    endedAt?: string;
    exitCode?: number;
    pid?: number;
    stdOut?: string;
    stdErr?: string;
  }
) {
  if (!options.debug && !options.teeOutput) return;
  const lines = [
    `=== ${options.phase ?? "command"} ${event.status} ===`,
    `startedAt=${event.startedAt}`,
    event.endedAt ? `endedAt=${event.endedAt}` : undefined,
    event.pid != null ? `pid=${event.pid}` : undefined,
    event.exitCode != null ? `exitCode=${event.exitCode}` : undefined,
    options.logFile ? `logFile=${options.logFile}` : undefined,
    `cwd=${event.cwd}`,
    `command=${event.command}`,
    `env=${event.envDiff}`,
  ].filter(Boolean);
  if (event.status == "end" && options.teeOutput) {
    lines.push("stdout:");
    lines.push(summarizeText(event.stdOut ?? ""));
    lines.push("stderr:");
    lines.push(summarizeText(event.stdErr ?? ""));
  }
  const trace = `${lines.join("\n")}\n\n`;
  await log(trace.trimEnd());
  if (options.logFile && (options.debug || options.teeOutput)) {
    await appendFile(options.logFile, trace);
  }
}

function formatEnvDiff(env?: { [key: string]: string }): string {
  const entries = Object.entries(env ?? {}).filter(([, value]) => value);
  if (!entries.length) return "{}";
  return `{ ${entries.map(([key, value]) => `${key}=${value}`).join(", ")} }`;
}

function getExecutionCwd(): string {
  try {
    return resolve("./");
  } catch {
    return "unknown";
  }
}

export function runInSudo(cmd: string) {
  return build([
    "osascript",
    "-e",
    [
      "do",
      "shell",
      "script",
      `"${`${cmd}`.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
      "with",
      "administrator",
      "privileges",
    ].join(" "),
  ]);
}

export function tar_extract(src: string, dst: string) {
  return exec(["tar", "-zxvf", src, "-C", dst]);
}

export function tar_extract_directory(
  src: string,
  dst: string,
  dir: string,
  isXZ: boolean
) {
  const stripCount = dir.split("/").length;
  return exec([
    "tar",
    `--strip-components=${stripCount}`,
    "-C",
    dst,
    isXZ ? "-Jxvf" : "-zxvf",
    src,
    dir,
  ]);
}

export async function spawn(
  segments: CommandSegments,
  env?: { [key: string]: string }
) {
  const cmd = build(segments, env);
  await log(cmd);
  const { pid, id } = await Neutralino.os.spawnProcess(cmd);
  // await Neutralino.os.
  await log(pid + "");
  await log(cmd);
  return { pid, id };
}

export async function getKey(key: string): Promise<string> {
  return await Neutralino.storage.getData(key);
}

export async function getKeyOrDefault(
  key: string,
  defaultValue: string
): Promise<string> {
  try {
    return await getKey(key);
  } catch {
    return defaultValue;
  }
}

export async function setKey(key: string, value: string | null) {
  return await Neutralino.storage.setData(key, value);
}

export function log(message: string) {
  return Neutralino.debug.log(message, "INFO");
}

export function warn(message: string) {
  return Neutralino.debug.log(message, "WARNING");
}

export function logerror(message: string) {
  return Neutralino.debug.log(message, "ERROR");
}

export function restart() {
  return Neutralino.app.restartProcess();
}

export async function fatal(error: unknown) {
  await Neutralino.os.showMessageBox(
    "Fatal error",
    `${error instanceof Error ? String(error) : JSON.stringify(error)}`,
    "OK"
  );
  await shutdown();
  Neutralino.app.exit(-1);
}

export async function appendFile(path: string, content: string) {
  await Neutralino.filesystem.appendFile(resolve(path), content);
}

export async function forceMove(source: string, destination: string) {
  return await exec([
    "mv",
    "-f",
    `${resolve(source)}`,
    `${resolve(destination)}`,
  ]);
}

export async function cp(source: string, destination: string) {
  return await exec([
    "cp",
    "-p",
    `${resolve(source)}`,
    `${resolve(destination)}`,
  ]);
}

export async function rmrf_dangerously(target: string) {
  return await exec(["rm", "-rf", target]);
}

export async function prompt(title: string, message: string) {
  const out = await Neutralino.os.showMessageBox(title, message, "YES_NO");
  return out == "YES";
}

export async function promptUpdate(
  title: string,
  message: string,
  cancelText: string,
  ignoreText: string,
  updateText: string
) {
  try {
    const script = `button returned of (display dialog "${message.replaceAll(
      '"',
      '\\"'
    )}" with title "${title.replaceAll(
      '"',
      '\\"'
    )}" buttons {"${ignoreText}", "${cancelText}", "${updateText}"} default button "${updateText}")`;
    const ret = await Neutralino.os.execCommand(`osascript -e '${script}'`, {});
    const val = ret.stdOut.trim();
    if (val === updateText) return "UPDATE";
    if (val === ignoreText) return "IGNORE";
    return "CANCEL";
  } catch (e) {
    const out = await Neutralino.os.showMessageBox(
      title,
      message,
      "YES_NO_CANCEL"
    );
    if (out == "YES") return "UPDATE";
    if (out == "NO") return "IGNORE";
    return "CANCEL";
  }
}

export async function alert(title: string, message: string) {
  return await Neutralino.os.showMessageBox(title, message, "OK");
}

export async function openDir(title: string) {
  const out = await Neutralino.os.showFolderDialog(title, {});
  return out;
}

export async function readFile(path: string) {
  return await Neutralino.filesystem.readFile(resolve(path));
}

export async function readDirectory(path: string) {
  return await Neutralino.filesystem.readDirectory(resolve(path));
}

export async function readBinary(path: string) {
  return await Neutralino.filesystem.readBinaryFile(resolve(path));
}

export async function readAllLines(path: string) {
  const content = await Neutralino.filesystem.readFile(resolve(path));
  if (content.indexOf("\r\n") >= 0) {
    return content.split("\r\n");
  }
  return content.split("\n");
}

export async function readAllLinesIfExists(path: string) {
  try {
    await stats(resolve(path));
  } catch {
    return [];
  }
  const content = await Neutralino.filesystem.readFile(resolve(path));
  if (content.indexOf("\r\n") >= 0) {
    return content.split("\r\n");
  }
  return content.split("\n");
}

export async function writeBinary(path: string, data: ArrayBuffer) {
  return await Neutralino.filesystem.writeBinaryFile(resolve(path), data);
}

export async function writeFile(path: string, data: string) {
  return await Neutralino.filesystem.writeFile(resolve(path), data);
}

export async function removeFile(path: string) {
  return await Neutralino.filesystem.removeFile(resolve(path));
}

export async function removeFileIfExists(path: string) {
  try {
    await stats(resolve(path));
  } catch {
    return;
  }
  return await Neutralino.filesystem.removeFile(resolve(path));
}

export async function stats(path: string) {
  return await Neutralino.filesystem.getStats(resolve(path));
}

export async function fileOrDirExists(path: string) {
  try {
    await stats(path);
    return true;
  } catch {
    return false;
  }
}

export async function env(key: string) {
  return Neutralino.os.getEnv(key);
}

export function exit(exitCode: number) {
  return Neutralino.app.exit(exitCode);
}

export function getMemoryInfo() {
  return Neutralino.computer.getMemoryInfo();
}

export function getCPUInfo() {
  return Neutralino.computer.getCPUInfo();
}

export function open(url: string) {
  return Neutralino.os.open(url);
}

export const sha1sum = async (message: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join(""); // convert bytes to hex string
  return hashHex;
};

const hooks: Array<(forced: boolean) => Promise<boolean>> = [];

export function addTerminationHook(fn: (forced: boolean) => Promise<boolean>) {
  hooks.push(fn);
  const len = hooks.length;
  return () => {
    if (hooks.length !== len) {
      throw new Error("Unexpected behavior!");
    }
    hooks.pop();
  };
}

// ??
export async function GLOBAL_onClose(forced: boolean) {
  for (const hook of hooks.reverse()) {
    if (!(await hook(forced)) && !forced) {
      return false; // aborted
    }
  }
  return true;
}

export async function shutdown() {
  for (const hook of hooks.reverse()) {
    await hook(true);
  }
}

export async function _safeRelaunch() {
  await shutdown();
  // await wait(1000);
  // HACK
  if (import.meta.env.PROD) {
    const app = await Neutralino.os.getEnv("PATH_LAUNCH");
    await Neutralino.os.execCommand(`open "${app}"`, {
      background: true,
    });
    Neutralino.app.exit(0);
  } else {
    Neutralino.app.restartProcess();
  }
}
