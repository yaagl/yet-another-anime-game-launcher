import { join } from "path-browserify";
import { build, CommandSegments, rawString } from "../command-builder";

export async function resolve(path: string) {
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
  sudo = false,
  log_redirect: string | undefined = undefined
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = build(
    [...segments, ...(log_redirect ? [rawString("&>"), log_redirect] : [])],
    env
  );
  await log(sudo ? runInSudo(cmd) : cmd);
  const ret = await Neutralino.os.execCommand(sudo ? runInSudo(cmd) : cmd, {});
  if (ret.exitCode != 0) {
    throw new Error(
      `Command return non-zero code\n${cmd}\nStdOut:\n${ret.stdOut}\nStdErr:\n${ret.stdErr}`
    );
  }
  return ret;
}

export async function exec2(
  segments: CommandSegments,
  env?: { [key: string]: string },
  sudo = false,
  log_redirect: string | undefined = undefined
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = build(
    [...segments, ...(log_redirect ? [rawString("&>"), log_redirect] : [])],
    env
  );
  await log(cmd);
  const { id, pid } = await Neutralino.os.spawnProcess(cmd);
  return await new Promise((res, rej) => {
    const handler: Neutralino.events.Handler<
      Neutralino.os.SpawnProcessResult
    > = (event) => {
      if (!event) return;
      let stdErr = "",
        stdOut = "";
      if (event.detail.id == id) {
        if (event.detail["action"] == "exit") {
          const exit = Number(event.detail["data"]);
          if (exit == 0) {
            res({
              pid,
              exitCode: exit,
              stdErr,
              stdOut,
            });
          } else {
            rej(
              new Error(
                `Command return non-zero code\n${cmd}\nStdOut:\n${stdOut}\nStdErr:\n${stdErr}`
              )
            );
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

export function runInSudo(cmd: string) {
  return build([
    "osascript",
    "-e",
    [
      "do",
      "shell",
      "script",
      `"${cmd.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`,
      "with",
      "administrator",
      "privileges",
    ].join(" "),
  ]);
}

export function tar_extract(src: string, dst: string) {
  return exec(["tar", "-zxvf", src, "-C", dst]);
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
  await Neutralino.filesystem.appendFile(await resolve(path), content);
}

export async function forceMove(source: string, destination: string) {
  return await exec([
    "mv",
    "-f",
    `${await resolve(source)}`,
    `${await resolve(destination)}`,
  ]);
}

export async function cp(source: string, destination: string) {
  return await exec([
    "cp",
    "-p",
    `${await resolve(source)}`,
    `${await resolve(destination)}`,
  ]);
}

export async function rmrf_dangerously(target: string) {
  return await exec(["rm", "-rf", target]);
}

export async function prompt(title: string, message: string) {
  const out = await Neutralino.os.showMessageBox(title, message, "YES_NO");
  return out == "YES";
}

export async function alert(title: string, message: string) {
  return await Neutralino.os.showMessageBox(title, message, "OK");
}

export async function openDir(title: string) {
  const out = await Neutralino.os.showFolderDialog(title, {});
  return out;
}

export async function readBinary(path: string) {
  return await Neutralino.filesystem.readBinaryFile(await resolve(path));
}

export async function readAllLines(path: string) {
  const content = await Neutralino.filesystem.readFile(await resolve(path));
  if (content.indexOf("\r\n") >= 0) {
    return content.split("\r\n");
  }
  return content.split("\n");
}

export async function readAllLinesIfExists(path: string) {
  try {
    await stats(await resolve(path));
  } catch {
    return [];
  }
  const content = await Neutralino.filesystem.readFile(await resolve(path));
  if (content.indexOf("\r\n") >= 0) {
    return content.split("\r\n");
  }
  return content.split("\n");
}

export async function writeBinary(path: string, data: ArrayBuffer) {
  return await Neutralino.filesystem.writeBinaryFile(await resolve(path), data);
}

export async function writeFile(path: string, data: string) {
  return await Neutralino.filesystem.writeFile(await resolve(path), data);
}

export async function removeFile(path: string) {
  return await Neutralino.filesystem.removeFile(await resolve(path));
}

export async function removeFileIfExists(path: string) {
  try {
    await stats(await resolve(path));
  } catch {
    return;
  }
  return await Neutralino.filesystem.removeFile(await resolve(path));
}

export async function stats(path: string) {
  return await Neutralino.filesystem.getStats(await resolve(path));
}

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
