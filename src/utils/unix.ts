import { exec, resolve } from "./neu";

export async function xattrRemove(attr: string, path: string) {
  return await exec(`xattr`, [ '-r', '-d', attr ,`"${await resolve(path)}"`], {}, true);
}

export async function md5(path: string): Promise<string> {
  const p = await exec("md5", ["-q", await resolve(path)]);
  return p.stdOut;
}

export async function xdelta3(
  originalFile: string,
  patchFile: string,
  targetFile: string
): Promise<Neutralino.os.ExecCommandResult> {
  return await exec(await resolve("./sidecar/xdelta/xdelta3"), [
    "-d",
    "-s",
    originalFile,
    patchFile,
    targetFile,
  ]);
}

export async function hpatchz(
    originalFile: string,
    patchFile: string,
    targetFile: string
) {
  return await exec(await resolve("./sidecar/hpatchz/hpatchz"), [
    "-f",
    originalFile,
    patchFile,
    targetFile
  ]);
}
