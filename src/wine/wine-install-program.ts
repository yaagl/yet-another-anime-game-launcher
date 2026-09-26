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
  readFile,
  writeFile,
} from "@utils";
import { ENSURE_HOSTS } from "../clients/secret";
import { ensureHosts } from "../hosts";
import { createWine } from "./wine";
import { installMediaFoundation } from "./mf";
import { WineDistribution } from "./distro";
import { addCertsToWine } from "./cert";
import { createD3DMetalLicenseUI } from "./d3dmetal-license";
import {
  D3DMETAL_RUNTIME_ID,
  loadD3DMetalLicense,
  prepareD3DMetalWine,
  validatePreparedD3DMetalWine,
  verifyD3DMetalArchive,
} from "./d3dmetal";

interface MetalInstallTransaction {
  phase: "publishing" | "committed";
  hadWine: boolean;
  hadPrefix: boolean;
  settings: string[];
}

function parseMetalInstallTransaction(
  contents: string
): MetalInstallTransaction {
  const value: unknown = JSON.parse(contents);
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("phase" in value) ||
    !("hadWine" in value) ||
    !("hadPrefix" in value) ||
    !("settings" in value) ||
    (value.phase !== "publishing" && value.phase !== "committed") ||
    typeof value.hadWine !== "boolean" ||
    typeof value.hadPrefix !== "boolean" ||
    !Array.isArray(value.settings) ||
    value.settings.length !== 5 ||
    value.settings.some(item => typeof item !== "string")
  ) {
    throw new Error("Invalid interrupted D3DMetal installation transaction");
  }
  return {
    phase: value.phase,
    hadWine: value.hadWine,
    hadPrefix: value.hadPrefix,
    settings: value.settings,
  };
}

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
  async function* installD3DMetal(): CommonUpdateProgram {
    const wineRoot = resolve("./wine");
    const stage = resolve("./wine.d3dmetal.staging");
    const previous = resolve("./wine.d3dmetal.previous");
    const prefixStage = wineAbsPrefix + ".d3dmetal.staging";
    const prefixPrevious = wineAbsPrefix + ".d3dmetal.previous";
    const archive = resolve(
      "./wine.d3dmetal." + generateRandomString(16) + ".tar.xz"
    );
    const transactionPath = resolve("./wine.d3dmetal.install.json");
    const transactionTemp = transactionPath + ".staging";
    const settingKeys = [
      "wine_state",
      "wine_tag",
      "wine_update_url",
      "wine_update_tag",
      "wine_netbiosname",
    ];
    if (await fileOrDirExists(transactionPath)) {
      const transaction = parseMetalInstallTransaction(
        await readFile(transactionPath)
      );
      if (transaction.phase === "committed") {
        await validatePreparedD3DMetalWine(wineRoot);
        if (!(await fileOrDirExists(wineAbsPrefix))) {
          throw new Error(
            "Committed D3DMetal installation has no prefix; preserving backups"
          );
        }
        if (await fileOrDirExists(previous)) await rmrf_dangerously(previous);
        if (await fileOrDirExists(prefixPrevious))
          await rmrf_dangerously(prefixPrevious);
      } else {
        for (const [current, backup, hadCurrent] of [
          [wineRoot, previous, transaction.hadWine],
          [wineAbsPrefix, prefixPrevious, transaction.hadPrefix],
        ] as const) {
          if (hadCurrent && (await fileOrDirExists(backup))) {
            if (await fileOrDirExists(current)) await rmrf_dangerously(current);
            await exec(["/bin/mv", backup, current]);
          } else if (hadCurrent && !(await fileOrDirExists(current))) {
            throw new Error(
              "Interrupted D3DMetal installation lost its backup: " + backup
            );
          } else if (!hadCurrent && (await fileOrDirExists(current))) {
            await rmrf_dangerously(current);
          }
        }
        for (const [index, key] of settingKeys.entries()) {
          await setKey(key, transaction.settings[index] || null);
        }
        if (await fileOrDirExists(stage)) await rmrf_dangerously(stage);
        if (await fileOrDirExists(prefixStage))
          await rmrf_dangerously(prefixStage);
      }
      await removeFile(transactionPath);
    }
    if (
      (await fileOrDirExists(previous)) ||
      (await fileOrDirExists(prefixPrevious)) ||
      (await fileOrDirExists(stage)) ||
      (await fileOrDirExists(prefixStage))
    ) {
      throw new Error(
        "An interrupted D3DMetal install tree needs inspection before reinstalling"
      );
    }
    if (await fileOrDirExists(transactionTemp))
      await removeFile(transactionTemp);
    const hadWine = await fileOrDirExists(wineRoot);
    const hadPrefix = await fileOrDirExists(wineAbsPrefix);
    let publishedWine = false;
    let publishedPrefix = false;
    let settingsChanged = false;
    let wineInitialized = false;
    const formerSettings = await Promise.all(
      settingKeys.map(key => getKeyOrDefault(key, ""))
    );
    try {
      yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
      for await (const progress of aria2.doStreamingDownload({
        uri: wineDistro.remoteUrl,
        absDst: archive,
      })) {
        if (progress.totalLength > BigInt(0)) {
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
          humanFileSize(Number(progress.downloadSpeed)),
        ];
      }
      await verifyD3DMetalArchive(archive);
      yield ["setStateText", "EXTRACT_ENVIRONMENT"];
      yield ["setUndeterminedProgress"];
      await exec(["/bin/mkdir", stage]);
      await tar_extract_directory(
        archive,
        stage,
        wineDistro.attributes.winePath ?? "wine",
        true
      );
      await prepareD3DMetalWine(stage);
      await validatePreparedD3DMetalWine(stage);
      await addCertsToWine(stage);
      await xattrRemove("com.apple.quarantine", stage);
      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];
      yield ["setUndeterminedProgress"];
      // Publish the verified Wine tree before wineboot so prefix links resolve
      // against its stable final path. Both former trees remain backed up.
      const transaction: MetalInstallTransaction = {
        phase: "publishing",
        hadWine,
        hadPrefix,
        settings: formerSettings,
      };
      await writeFile(transactionTemp, JSON.stringify(transaction));
      await exec(["/bin/mv", transactionTemp, transactionPath]);
      if (await fileOrDirExists(wineRoot))
        await exec(["/bin/mv", wineRoot, previous]);
      await exec(["/bin/mv", stage, wineRoot]);
      publishedWine = true;
      wineInitialized = true;
      const wine = await createWine({
        prefix: prefixStage,
        distro: wineDistro,
        wineRoot,
      });
      await wine.exec("wineboot", ["-u"], {}, "/dev/null");
      await wine.exec("winecfg", ["-v", "win10"], {}, "/dev/null");
      if (
        String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("bh3") ||
        String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("cbjq")
      ) {
        yield* installMediaFoundation(aria2, wine);
      }
      await wine.waitUntilServerOff();
      if (await fileOrDirExists(wineAbsPrefix))
        await exec(["/bin/mv", wineAbsPrefix, prefixPrevious]);
      await exec(["/bin/mv", prefixStage, wineAbsPrefix]);
      publishedPrefix = true;
      await validatePreparedD3DMetalWine(wineRoot);
      settingsChanged = true;
      await setKey("wine_tag", wineDistro.id);
      await setKey("wine_update_url", null);
      await setKey("wine_update_tag", null);
      await setKey("wine_netbiosname", "DESKTOP-" + generateRandomString(7));
      await setKey("wine_state", "ready");
      await writeFile(
        transactionTemp,
        JSON.stringify({ ...transaction, phase: "committed" })
      );
      await exec(["/bin/mv", transactionTemp, transactionPath]);
      yield ["setStateText", "INSTALL_DONE"];
    } catch (error) {
      // A failure during publication must not leave half of the new pair live.
      // If restoring either tree fails, preserve its backup rather than hiding it.
      for (const [current, backup] of [
        [wineRoot, previous],
        [wineAbsPrefix, prefixPrevious],
      ]) {
        if (await fileOrDirExists(backup)) {
          if (await fileOrDirExists(current)) await rmrf_dangerously(current);
          await exec(["/bin/mv", backup, current]);
        } else if (
          (current === wineRoot
            ? publishedWine && !hadWine
            : publishedPrefix && !hadPrefix) &&
          (await fileOrDirExists(current))
        ) {
          await rmrf_dangerously(current);
        }
      }
      if (settingsChanged) {
        for (const [index, key] of settingKeys.entries()) {
          await setKey(key, formerSettings[index] || null);
        }
      } else if (wineInitialized && !formerSettings[4]) {
        await setKey("wine_netbiosname", null);
      }
      if (await fileOrDirExists(transactionPath))
        await removeFile(transactionPath);
      throw error;
    } finally {
      if (await fileOrDirExists(archive)) await removeFile(archive);
      if (await fileOrDirExists(stage)) await rmrf_dangerously(stage);
      if (await fileOrDirExists(prefixStage))
        await rmrf_dangerously(prefixStage);
      if (await fileOrDirExists(transactionTemp))
        await removeFile(transactionTemp);
    }
    if (await fileOrDirExists(previous)) await rmrf_dangerously(previous);
    if (await fileOrDirExists(prefixPrevious))
      await rmrf_dangerously(prefixPrevious);
    await removeFile(transactionPath);
  }

  async function* program(acceptedAppleLicense = false): CommonUpdateProgram {
    if (wineDistro.attributes.renderBackend === "d3dmetal") {
      if (!acceptedAppleLicense)
        throw new Error(
          "Apple license consent is required before installing D3DMetal"
        );
      yield* installD3DMetal();
      return;
    }
    const wineBinaryDir = resolve("./wine");

    await rmrf_dangerously(wineAbsPrefix);
    yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
    const isXZ = wineDistro.remoteUrl.endsWith(".xz");
    const wineTarPath = resolve("./wine.tar." + (isXZ ? "xz" : "gz"));
    for await (const progress of aria2.doStreamingDownload({
      uri: wineDistro.remoteUrl,
      absDst: wineTarPath,
    })) {
      yield [
        "setProgress",
        Number((progress.completedLength * BigInt(100)) / progress.totalLength),
      ];
      yield [
        "setStateText",
        "DOWNLOADING_ENVIRONMENT_SPEED",
        `${humanFileSize(Number(progress.downloadSpeed))}`,
      ];
    }
    yield ["setStateText", "EXTRACT_ENVIRONMENT"];
    yield ["setUndeterminedProgress"];
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
    await wine.exec("wineboot", ["-u"], {}, "/dev/null");
    await wine.exec("winecfg", ["-v", "win10"], {}, "/dev/null");

    // FIXME: don't abuse import.meta.env
    if (
      String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("bh3") ||
      String(import.meta.env["YAAGL_CHANNEL_CLIENT"]).startsWith("cbjq")
    ) {
      yield* installMediaFoundation(aria2, wine);
    }

    await setKey("wine_state", "ready");
    await setKey("wine_tag", wineDistro.id);
    await setKey("wine_update_url", null);
    await setKey("wine_update_tag", null);
    const netbiosname = `DESKTOP-${generateRandomString(7)}`; // exactly 15 chars
    await setKey("wine_netbiosname", netbiosname);
    yield ["setStateText", "INSTALL_DONE"];
  }

  if (wineDistro.id === D3DMETAL_RUNTIME_ID) {
    return createD3DMetalLicenseUI({
      locale,
      loadLicense: () => loadD3DMetalLicense(aria2),
      onAccept: () => createCommonUpdateUI(locale, () => program(true)),
    });
  }
  return createCommonUpdateUI(locale, () => program());
}
