import { rawString } from "./command-builder";
import { wait } from "./helper";
import { exec, spawn, resolve, log } from "./neu";

export async function xattrRemove(attr: string, path: string) {
  return await exec(
    [`/usr/bin/xattr`, "-s", "-r", "-d", attr, `${resolve(path)}`],
    {},
    true
  );
}

export async function md5(path: string): Promise<string> {
  const p = await exec(["md5", "-q", resolve(path)]);
  return p.stdOut.split("\n")[0];
}

export async function xdelta3(
  originalFile: string,
  patchFile: string,
  targetFile: string
): Promise<Neutralino.os.ExecCommandResult> {
  return await exec([
    resolve("./sidecar/xdelta/xdelta3"),
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
    resolve("./sidecar/hpatchz/hpatchz"),
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
  const logFile = resolve("decompress.log");
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
  const handler: Neutralino.events.Handler<
    Neutralino.os.SpawnProcessResult
  > = event => {
    if (!event) return;
    log(JSON.stringify(event.detail));
    if (event.detail.id == id) {
      if (event.detail["action"] == "exit") {
        processExit = true;
        processExitCode = Number(event.detail["data"]);
      }
    }
  };
  await Neutralino.events.on("spawnedProcess", handler);
  while (processExit == false) {
    await wait(200);
    const dNumber = Number(
      (await exec(["wc", "-l", rawString("<"), logFile])).stdOut
        .trim()
        .split(" ")[0]
    );
    yield [dNumber, totalLines] as const;
  }
  await Neutralino.events.off("spawnedProcess", handler);
  if (processExitCode == 0) {
    return;
  }
  throw new Error("unzip exited with code " + processExitCode);
}

export async function* doStreamUn7z(
  sources: string[],
  destination: string
): AsyncGenerator<readonly [number, number], void, unknown> {
  const logFile = resolve("decompress.log");
  let processExit = false,
    processExitCode = 0;

  const mainFile = sources.find(file => file.endsWith(".001"));
  if (!mainFile) throw new Error("Missing main .001 file for decompression!");

  const totalLines = Number(
    (
      await exec([
        resolve("./sidecar/7z/7zz"),
        "l",
        mainFile,
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

  // Extract the. 7z file
  const { id } = await spawn([
    resolve("./sidecar/7z/7zz"),
    "x",
    `-o${destination}`,
    mainFile, //Just need to transfer the. 001 file
    rawString("|"),
    "tee",
    logFile,
    rawString("&>"),
    "/dev/null",
  ]);

  const handler: Neutralino.events.Handler<
    Neutralino.os.SpawnProcessResult
  > = event => {
    if (!event) return;
    if (event.detail.id == id) {
      if (event.detail["action"] == "exit") {
        processExit = true;
        processExitCode = Number(event.detail["data"]);
      }
    }
  };

  await Neutralino.events.on("spawnedProcess", handler);

  while (processExit == false) {
    await wait(200);
    const dNumber = Number(
      (await exec(["wc", "-l", rawString("<"), logFile])).stdOut
        .trim()
        .split(" ")[0]
    );
    yield [dNumber, totalLines] as const;
  }

  await Neutralino.events.off("spawnedProcess", handler);

  if (processExitCode != 0) {
    throw new Error("7z exited with code " + processExitCode);
  }
}

export async function extract7z(source: string, destination: string) {
  return await exec([
    resolve("./sidecar/7z/7zz"),
    "x",
    source,
    `-o${destination}`,
    "-y",
  ]);
}

export function getFreeSpace(path: string, unit: "m" | "k" | "g") {
  return exec([
    "/bin/df",
    "-" + unit,
    path,
    rawString("|"),
    "/usr/bin/awk",
    "{print $4}",
    rawString("|"),
    "/usr/bin/grep",
    "-v",
    "^Available",
  ]).then(output => {
    return parseInt(output.stdOut.split("\n")[0]);
  });
}
