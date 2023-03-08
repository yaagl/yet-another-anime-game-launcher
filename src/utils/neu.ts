import { join } from "path-browserify";

export async function resolve(path: string) {
  if (path.startsWith("./")) {
    path = join(import.meta.env.PROD ? window.NL_PATH : window.NL_CWD, path);
    // await Neutralino.os.showMessageBox("1", command, "OK");
    if (!path.startsWith("/") || path == "/")
      throw new Error("Assertation failed " + path);
  }
  return path;
}

export async function exec(
  command: string,
  args: string[],
  env?: { [key: string]: string },
  sudo: boolean = false
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = `${
    env && typeof env == "object"
      ? Object.keys(env)
          .map((key) => {
            return `${key}=${env[key]} `;
          })
          .join("")
      : ""
  }"${await resolve(command)}" ${args
    .map((x) => {
      if (x.startsWith('"') || x.startsWith("'")) return x;
      if (x.indexOf(" ") > -1) return `"${x}"`;
      return x;
    })
    .join(" ")}`;
  const ret = sudo
    ? await runInSudo(cmd)
    : await Neutralino.os.execCommand(cmd, {});
  if (ret.exitCode != 0) {
    throw new Error(
      `Command return non-zero code\n${cmd}\nStdOut:\n${ret.stdOut}\nStdErr:\n${ret.stdErr}`
    );
  }
  return ret;
}

export async function runInSudo(command: string) {
  command = command.replaceAll('"', '\\\\\\"').replaceAll("'", "\\'");
  await log(command);
  return await Neutralino.os.execCommand(
    `osascript -e $'do shell script "${command}" with administrator privileges'`,
    {}
  );
}

export function tar_extract(src: string, dst: string) {
  return exec("tar", ["-zxvf", src, "-C", dst]);
}

export async function spawn(command: string, args: string[]) {
  const cmd = `"${await resolve(command)}" ${args.join(" ")}`;
  const { pid } = await Neutralino.os.spawnProcess(cmd);
  // await Neutralino.os.
  await log(pid + "");
  await log(cmd);
  return pid;
}

export async function getKey(key: string): Promise<string> {
  return await Neutralino.storage.getData(key);
}

export async function setKey(key: string, value: string | null) {
  return await Neutralino.storage.setData(key, value!);
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

export async function fatal(error: any) {
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
  return await exec("mv", [
    "-f",
    `"${await resolve(source)}"`,
    `"${await resolve(destination)}"`,
  ]);
}

export async function rmrf_dangerously(target: string) {
  return await exec("rm", ["-rf", target]);
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
  return await Neutralino.filesystem.readBinaryFile(path);
}

export async function readAllLines(path: string) {
  const content = await Neutralino.filesystem.readFile(path);
  if (content.indexOf("\r\n") >= 0) {
    return content.split("\r\n");
  }
  return content.split("\n");
}

export async function writeBinary(path: string, data: ArrayBuffer) {
  return await Neutralino.filesystem.writeBinaryFile(path, data);
}

export async function removeFile(path: string) {
  return await Neutralino.filesystem.removeFile(path);
}

export async function stats(path: string) {
  return await Neutralino.filesystem.getStats(path);
}

const hooks: Array<(forced: boolean) => Promise<boolean>> = [async ()=>{
  await setKey("singleton", null);
  return true;
}];

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
