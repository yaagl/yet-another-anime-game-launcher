import { CommonUpdateProgram } from "@common-update-ui";
import {
  exec,
  fileOrDirExists,
  forceMove,
  log,
  resolve,
  rmrf_dangerously,
  setKey,
} from "@utils";

function parseMountPoint(output: string): string {
  const matches = [
    ...output.matchAll(/<key>mount-point<\/key>\s*<string>([^<]+)<\/string>/g),
  ];
  return (matches[matches.length - 1]?.[1] ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

async function detach(mountPoint: string) {
  try {
    await exec(["hdiutil", "detach", mountPoint, "-quiet"]);
  } catch (error) {
    await log(`Failed to detach ${mountPoint}: ${String(error)}`);
  }
}

async function mountDMG(dmgPath: string) {
  const mountResult = await exec([
    "hdiutil",
    "attach",
    dmgPath,
    "-nobrowse",
    "-readonly",
    "-plist",
  ]);
  const mountPoint = parseMountPoint(mountResult.stdOut);
  if (!mountPoint) {
    throw new Error("Could not mount the selected GPTK disk image.");
  }
  return mountPoint;
}

export async function* installD3DMetalFromDMG(
  dmgPath: string
): CommonUpdateProgram {
  yield ["setStateText", "EXTRACT_ENVIRONMENT"];
  yield ["setUndeterminedProgress"];

  const mountPoint = await mountDMG(dmgPath);
  const mounts = [mountPoint];

  const temporaryPaths: string[] = [];
  try {
    let sourceDir = `${mountPoint}/redist/lib`;
    if (!(await fileOrDirExists(sourceDir))) {
      const entries = await Neutralino.filesystem.readDirectory(mountPoint);
      const images = entries.filter(entry =>
        /^Evaluation environment for Windows games.*\.dmg$/i.test(entry.entry)
      );
      if (images.length === 1) {
        const innerMount = await mountDMG(`${mountPoint}/${images[0].entry}`);
        mounts.push(innerMount);
        sourceDir = `${innerMount}/redist/lib`;
      }
    }
    if (!(await fileOrDirExists(sourceDir))) {
      throw new Error(
        "Select the Evaluation environment for Windows games DMG inside the Game Porting Toolkit download."
      );
    }

    yield ["setStateText", "CONFIGURING_ENVIRONMENT"];
    const wineLibDir = resolve("./wine/lib");
    const installId = Date.now();
    const directories = ["external", "wine"];
    const changes: {
      destination: string;
      staging: string;
      rollback: string;
      moved: boolean;
      installed: boolean;
    }[] = [];

    for (const directory of directories) {
      const source = `${sourceDir}/${directory}`;
      if (!(await fileOrDirExists(source))) {
        throw new Error(
          `The selected disk image is missing redist/lib/${directory}.`
        );
      }

      const destination = `${wineLibDir}/${directory}`;
      const staging = `${wineLibDir}/.${directory}.d3dmetal-${installId}`;
      temporaryPaths.push(staging);
      // Keep Wine modules missing from the DMG.
      if (directory === "wine" && (await fileOrDirExists(destination))) {
        await exec(["ditto", destination, staging]);
      }
      await exec(["ditto", source, staging]);
      try {
        await exec(["/usr/bin/xattr", "-dr", "com.apple.quarantine", staging]);
      } catch {
        // The attribute may be absent.
      }
      changes.push({
        destination,
        staging,
        rollback: `${destination}.d3dmetal-${installId}`,
        moved: false,
        installed: false,
      });
    }

    try {
      for (const change of changes) {
        if (await fileOrDirExists(change.destination)) {
          await forceMove(change.destination, change.rollback);
          change.moved = true;
        }
        await forceMove(change.staging, change.destination);
        change.installed = true;
      }
    } catch (error) {
      for (const change of [...changes].reverse()) {
        if (change.installed) {
          await rmrf_dangerously(change.destination);
        }
        if (change.moved && (await fileOrDirExists(change.rollback))) {
          await forceMove(change.rollback, change.destination);
        }
      }
      throw error;
    }

    for (const change of changes) {
      if (!change.moved) continue;
      const backup = `${change.destination}.old`;
      if (await fileOrDirExists(backup)) {
        await rmrf_dangerously(change.rollback);
      } else {
        await forceMove(change.rollback, backup);
      }
    }

    await setKey("hkrpg_d3dmetal_installed", "true");
  } finally {
    try {
      for (const path of temporaryPaths) {
        if (await fileOrDirExists(path)) await rmrf_dangerously(path);
      }
    } finally {
      for (const mounted of mounts.reverse()) await detach(mounted);
    }
  }
}
