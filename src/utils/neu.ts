import { resolve as resolvep } from "path-browserify";

export async function resolve(command: string) {
  // ?????
  if (import.meta.env.DEV && command.startsWith("./")) {
    command = resolvep(window.NL_PATH, command);
    await Neutralino.os.showMessageBox("1", command, "OK");
  }
  return command;
}

export async function exec(command: string, args: string[]) {
  const ret = await Neutralino.os.execCommand(
    `${await resolve(command)} ${args.join(" ")}`,
    {}
  );
  if(ret.exitCode!=0) {
    throw new Error(ret.stdErr);
  }
  return ret;
}

export function tar_extract(src: string, dst: string) {
  return exec("tar", ["-xzvf", src, "-C", dst]);
}

export async function spawn(command: string, args: string[]) {
  const { pid } = await Neutralino.os.spawnProcess(
    `${await resolve(command)} ${args.join(" ")}`
  );
  // await Neutralino.os.
  Neutralino.debug.log(pid + "");
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
  await Neutralino.os.showMessageBox("Fatal error", "", "OK");
  await Neutralino.app.exit(-1);
}
