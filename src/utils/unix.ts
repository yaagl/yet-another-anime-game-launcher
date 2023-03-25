import { rawString } from "../command-builder";
import { wait } from "./helper";
import { exec, spawn, resolve, log } from "./neu";

export async function xattrRemove(attr: string, path: string) {
  return await exec(
    [`xattr`, "-r", "-d", attr, `${await resolve(path)}`],
    {},
    true
  );
}

export async function md5(path: string): Promise<string> {
  const p = await exec(["md5", "-q", await resolve(path)]);
  return p.stdOut.split("\n")[0];
}

export async function xdelta3(
  originalFile: string,
  patchFile: string,
  targetFile: string
): Promise<Neutralino.os.ExecCommandResult> {
  return await exec([
    await resolve("./sidecar/xdelta/xdelta3"),
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
  return await exec([
    await resolve("./sidecar/hpatchz/hpatchz"),
    "-f",
    originalFile,
    patchFile,
    targetFile,
  ]);
}

export function mkdirp(dir: string) {
  return exec(["mkdir", "-p", dir]);
}

// not so accurate progress
export async function* doStreamUnzip(
  source: string,
  destination: string
): AsyncGenerator<readonly [number, number], void, unknown> {
  const logFile = "decompress.log";
  let processExit = false,
    processExitCode = 0;

  const totalLines = Number(
    (
      await exec([
        "unzip",
        "-l",
        source,
        rawString("|"),
        "tee",
        logFile,
        rawString("|"),
        "wc",
        "-l",
      ])
    ).stdOut
      .trim()
      .split(" ")[0]
  );
  const { id } = await spawn([
    "unzip",
    "-o",
    source,
    "-d",
    destination,
    rawString("|"),
    "tee",
    logFile,
    rawString("&>"),
    "/dev/null",
  ]);
  const handler: Neutralino.events.Handler<Neutralino.os.SpawnProcessResult> = (
    event
  ) => {
    log(JSON.stringify(event!.detail));
    if (event!.detail.id == id) {
      if ((event!.detail as any)["action"] == "exit") {
        processExit = true;
        processExitCode = Number((event!.detail as any)["data"]);
      }
    }
  };
  await Neutralino.events.on("spawnedProcess", handler);
  while (processExit == false) {
    await wait(200);
    const dNumber = Number(
      (await exec(["wc", "-l", rawString("<"), logFile])).stdOut.trim().split(" ")[0]
    );
    yield [dNumber, totalLines] as const;
  }
  await Neutralino.events.off("spawnedProcess", handler);
  if (processExitCode == 0) {
    return;
  }
  throw new Error("unzip exited with code " + processExitCode);
}
