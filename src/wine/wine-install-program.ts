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
} from "@utils";
import { ENSURE_HOSTS } from "../clients/secret";
import { ensureHosts } from "../hosts";
import { createWine } from "./wine";
import { installMediaFoundation } from "./mf";
import { WineDistribution } from "./distro";
import { addCertsToWine } from "./cert";

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
  async function* program(): CommonUpdateProgram {
    // Use standard resolve() for wine directories (Neutralino 2026 standard)
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

  return createCommonUpdateUI(locale, program);
}
