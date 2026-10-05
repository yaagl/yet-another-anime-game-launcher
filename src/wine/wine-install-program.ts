import { Aria2 } from "@aria2";
import { CommonUpdateProgram, createCommonUpdateUI } from "@common-update-ui";
import { Locale } from "@locale";
import {
  rmrf_dangerously,
  humanFileSize,
  tar_extract,
  removeFile,
  xattrRemove,
  setKey,
  exec,
  generateRandomString,
  resolve,
  tar_extract_directory,
  fileOrDirExists,
  getKeyOrDefault,
  _safeRelaunch,
} from "@utils";
import { ENSURE_HOSTS } from "../clients/secret";
import { ensureHosts } from "../hosts";
import { createWine } from "./wine";
import { installMediaFoundation } from "./mf";
import { getWineDistributions } from "./distro";
import type { WineDistribution } from "./distro";
import { addCertsToWine } from "./cert";
import { createD3DMetalLicenseUI } from "./d3dmetal-license";
import {
  D3DMETAL_RUNTIME_ID,
  loadD3DMetalLicense,
  prepareD3DMetalWine,
  verifyD3DMetalArchive,
} from "./d3dmetal";

export async function createWineInstallProgram({
  aria2,
  wineAbsPrefix,
  wineDistro,
  locale,
}: {
  aria2: Aria2;
  locale: Locale;
  wineAbsPrefix: string;
  wineDistro: WineDistribution;
}) {
  async function* program(acceptedAppleLicense = false): CommonUpdateProgram {
    const isOurRuntime = wineDistro.id === D3DMETAL_RUNTIME_ID;
    if (isOurRuntime && !acceptedAppleLicense) {
      throw new Error(
        "Apple license consent is required before installing D3DMetal"
      );
    }
    const wineBinaryDir = resolve("./wine");
    const isXZ = wineDistro.remoteUrl.endsWith(".xz");
    const suffix = isOurRuntime ? ".d3dmetal." + generateRandomString(16) : "";
    const wineTarPath = resolve(
      isOurRuntime
        ? `./wine${suffix}.tar.xz`
        : "./wine.tar." + (isXZ ? "xz" : "gz")
    );
    const stage = isOurRuntime ? resolve(`./wine${suffix}.staging`) : "";

    try {
      if (!isOurRuntime) await rmrf_dangerously(wineAbsPrefix);
      yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
      for await (const progress of aria2.doStreamingDownload({
        uri: wineDistro.remoteUrl,
        absDst: wineTarPath,
        checksum: wineDistro.checksum,
      })) {
        if (!isOurRuntime || progress.totalLength > BigInt(0)) {
          yield [
            "setProgress",
            Number(
              (progress.completedLength * BigInt(100)) / progress.totalLength
            ),
          ];
        }
        yield [
          "setStateText",
          "DOWNLOADING_ENVIRONMENT_SPEED",
          `${humanFileSize(Number(progress.downloadSpeed))}`,
        ];
      }
      if (isOurRuntime) await verifyD3DMetalArchive(wineTarPath);
      yield ["setStateText", "EXTRACT_ENVIRONMENT"];
      yield ["setUndeterminedProgress"];
      if (isOurRuntime) {
        await exec(["mkdir", "-p", stage]);
        await tar_extract_directory(
          wineTarPath,
          stage,
          wineDistro.attributes.winePath ?? "wine",
          true
        );
        await prepareD3DMetalWine(stage);
        // Preparation failures leave the active Wine tree and prefix untouched.
        await rmrf_dangerously(wineAbsPrefix);
        await rmrf_dangerously(wineBinaryDir);
        await exec(["/bin/mv", stage, wineBinaryDir]);
      } else {
        await rmrf_dangerously(wineBinaryDir);
        await exec(["mkdir", "-p", wineBinaryDir]);
        if (wineDistro.attributes.winePath) {
          await tar_extract_directory(
            resolve("./wine.tar." + (isXZ ? "xz" : "gz")),
            wineBinaryDir,
            wineDistro.attributes.winePath,
            isXZ
          );
        } else {
          await tar_extract(
            resolve("./wine.tar." + (isXZ ? "xz" : "gz")),
            wineBinaryDir
          );
        }
        await removeFile(wineTarPath);
      }

      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await addCertsToWine(wineBinaryDir);
      await xattrRemove("com.apple.quarantine", wineBinaryDir);

      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      yield ["setUndeterminedProgress"];
      await ensureHosts(ENSURE_HOSTS);

      const wine = await createWine({
        prefix: wineAbsPrefix,
        distro: wineDistro,
      });
      try {
        await wine.exec("wineboot", ["-u"], {}, resolve("wineboot.log"));
        await wine.exec("winecfg", ["-v", "win10"], {}, resolve("winecfg.log"));
      } catch (e) {
        throw new Error(
          `Wine initialization failed.\n\nPlease check the log file at:\n${resolve(
            "wineboot.log"
          )}\n\n(Please ensure Rosetta 2 is installed.)\n\nOriginal error:\n${
            e instanceof Error ? e.message : JSON.stringify(e)
          }`
        );
      }

      // FIXME: don't abuse import.meta.env
      if (
        String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("bh3") ||
        String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("cbjq")
      ) {
        yield* installMediaFoundation(aria2, wine);
      }

      // Keep a pending update selector on interrupted native installs until
      // the installed tag is recorded and the runtime is ready.
      if (isOurRuntime) await setKey("wine_tag", wineDistro.id);
      await setKey("wine_state", "ready");
      if (!isOurRuntime) await setKey("wine_tag", wineDistro.id);
      await setKey("wine_update_url", null);
      await setKey("wine_update_tag", null);
      const netbiosname = `DESKTOP-${generateRandomString(7)}`; // exactly 15 chars
      await setKey("wine_netbiosname", netbiosname);
      yield ["setStateText", "INSTALL_DONE"];
    } finally {
      if (isOurRuntime) {
        if (await fileOrDirExists(wineTarPath)) await removeFile(wineTarPath);
        if (await fileOrDirExists(stage)) await rmrf_dangerously(stage);
      }
    }
  }

  if (wineDistro.id === D3DMETAL_RUNTIME_ID) {
    return createD3DMetalLicenseUI({
      locale,
      loadLicense: () => loadD3DMetalLicense(aria2),
      onAccept: () => createCommonUpdateUI(locale, () => program(true)),
      onCancel: async () => {
        const previousTag = await getKeyOrDefault("wine_tag", "");
        if (
          previousTag !== D3DMETAL_RUNTIME_ID &&
          (await getWineDistributions()).some(x => x.id === previousTag) &&
          (await fileOrDirExists(resolve("./wine"))) &&
          (await fileOrDirExists(wineAbsPrefix)) &&
          !(await fileOrDirExists(
            resolve("./wine/lib/external/prepared-d3dmetal.json")
          ))
        ) {
          await setKey("wine_state", "ready");
          await setKey("wine_update_tag", null);
          await setKey("wine_update_url", null);
          await _safeRelaunch();
          return;
        }
        await Neutralino.app.exit(0);
      },
    });
  }
  return createCommonUpdateUI(locale, () => program());
}
