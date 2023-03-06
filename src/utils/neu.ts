import { join } from "path-browserify";

export async function resolve(command: string) {
  if (command.startsWith("./")) {
    command = join(
      import.meta.env.PROD ? window.NL_PATH : window.NL_CWD,
      command
    );
    // await Neutralino.os.showMessageBox("1", command, "OK");
  }
  return command;
}

export async function exec(
  command: string,
  args: string[]
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = `${await resolve(command)} ${args.join(" ")}`;
  const ret = await Neutralino.os.execCommand(cmd, {});
  if (ret.exitCode != 0) {
    throw new Error(
      `Command return non-zero code\n${cmd}\nStdOut:\n${ret.stdOut}\nStdErr:\n${ret.stdErr}`
    );
  }
  return ret;
}

export function tar_extract(src: string, dst: string) {
  return exec("tar", ["-xzvf", src, "-C", dst]);
}

export async function spawn(command: string, args: string[]) {
  const cmd = `${await resolve(command)} ${args.join(" ")}`;
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
  await Neutralino.os.showMessageBox("Fatal error", String(error), "OK");
  await Neutralino.app.exit(-1);
}

export async function appendFile(path: string, content: string) {
  await Neutralino.filesystem.appendFile(await resolve(path), content);
}

export async function forceMove(source: string, destination: string) {
  return await exec("mv", [
    "-f",
    await resolve(source),
    await resolve(destination),
  ]);
}

export async function prompt(title: string, message: string) {
  const out = await Neutralino.os.showMessageBox(title, message, "YES_NO");
  return out == "YES";
}

const hooks: Array<(forced: boolean)=>Promise<boolean>> = [];

export function addTerminationHook(fn: (forced: boolean)=>Promise<boolean>) {
  hooks.push(fn);
  const len = hooks.length;
  return () => {
    if(hooks.length!==len) {
      throw new Error('Unexpected behavior!');
    }
    hooks.pop();
  }
}

// ??
export async function GLOBAL_onClose(forced: boolean) {
  for(const hook of hooks.reverse()) {
    if(!await hook(forced)&&!forced) {
      return false; // aborted
    }
  }
  return true;
}

export async function shutdown() {
  for(const hook of hooks.reverse()) {
    await hook(true);
  }
}

