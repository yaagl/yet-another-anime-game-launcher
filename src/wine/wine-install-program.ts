import { Aria2 } from "@aria2";
import { CommonUpdateProgram, createCommonUpdateUI } from "@common-update-ui";
import { applyRecommendedSettings, RECOMMENDED_WINE_TAG } from "@config";
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
import { createInitialSetupUI } from "./initial-setup";
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
  wineUpdate = false,
  locale,
}: {
  aria2: Aria2;
  locale: Locale;
  wineAbsPrefix: string;
  wineDistro: WineDistribution;
  wineUpdate?: boolean;
}) {
  async function* program(
    targetDistro: WineDistribution,
    acceptedAppleLicense = false
  ): CommonUpdateProgram {
    const isOurRuntime = targetDistro.id === D3DMETAL_RUNTIME_ID;
    if (isOurRuntime && !acceptedAppleLicense) {
      throw new Error(
        "Apple license consent is required before installing D3DMetal"
      );
    }
    const wineBinaryDir = resolve("./wine");
    const isXZ = targetDistro.remoteUrl.endsWith(".xz");
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
        uri: targetDistro.remoteUrl,
        absDst: wineTarPath,
        checksum: targetDistro.checksum,
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
          targetDistro.attributes.winePath ?? "wine",
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
        if (targetDistro.attributes.winePath) {
          await tar_extract_directory(
            resolve("./wine.tar." + (isXZ ? "xz" : "gz")),
            wineBinaryDir,
            targetDistro.attributes.winePath,
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
        distro: targetDistro,
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
      if (isOurRuntime) await setKey("wine_tag", targetDistro.id);
      await setKey("wine_state", "ready");
      if (!isOurRuntime) await setKey("wine_tag", targetDistro.id);
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

  function createInstallerForDistro(
    targetDistro: WineDistribution,
    onBack?: () => void
  ) {
    if (targetDistro.id === D3DMETAL_RUNTIME_ID) {
      return createD3DMetalLicenseUI({
        locale,
        loadLicense: () => loadD3DMetalLicense(aria2),
        onAccept: () =>
          createCommonUpdateUI(locale, () => program(targetDistro, true)),
        onCancel: async () => {
          if (onBack) {
            await setKey("wine_state", null);
            await setKey("wine_update_tag", null);
            await setKey("wine_update_url", null);
            onBack();
            return;
          }
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
    return createCommonUpdateUI(locale, () => program(targetDistro));
  }

  if (wineUpdate) {
    return createInstallerForDistro(wineDistro);
  }

  return await createInitialSetupUI({
    locale,
    defaultWineDistro: wineDistro,
    onSelectRecommended: async onBack => {
      await applyRecommendedSettings();
      const versions = await getWineDistributions();
      const recommendedDistro =
        versions.find(x => x.id === RECOMMENDED_WINE_TAG) ?? wineDistro;
      return createInstallerForDistro(recommendedDistro, onBack);
    },
    onSelectCustom: async (chosenDistro, onBack) => {
      await setKey("wine_state", "update");
      await setKey("wine_update_tag", chosenDistro.id);
      await setKey("wine_update_url", chosenDistro.remoteUrl);
      return createInstallerForDistro(chosenDistro, onBack);
    },
  });
}
