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
} from "@utils";
import { ENSURE_HOSTS } from "../clients/secret";
import { CROSSOVER_DATA } from "./crossover";
import { ensureHosts } from "../hosts";
import { createWine } from "./wine";
import { installMediaFoundation } from "./mf";
import { WineDistribution } from "./distro";

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
    const wineBinaryDir = resolve("./wine");

    await rmrf_dangerously(wineAbsPrefix);
    if (!wineDistro.attributes.crossover && !wineDistro.attributes.whisky) {
      yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
      const wineTarPath = resolve("./wine.tar.gz");
      for await (const progress of aria2.doStreamingDownload({
        uri: wineDistro.remoteUrl,
        absDst: wineTarPath,
      })) {
        yield [
          "setProgress",
          Number(
            (progress.completedLength * BigInt(100)) / progress.totalLength,
          ),
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
      await tar_extract(resolve("./wine.tar.gz"), wineBinaryDir);
      await removeFile(wineTarPath);

      yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

      await xattrRemove("com.apple.quarantine", wineBinaryDir);
    }

    yield ["setStateText", "CONFIGURING_ENVIRONMENT"];

    yield ["setUndeterminedProgress"];
    await ensureHosts(ENSURE_HOSTS);

    const wine = await createWine({
      prefix: wineAbsPrefix,
      distro: wineDistro,
    });
    await wine.exec("wineboot", ["-u"], {}, "/dev/null");
    await wine.exec("winecfg", ["-v", "win10"], {}, "/dev/null");
    if (wineDistro.attributes.crossover) {
      await wine.exec(
        "rundll32",
        [
          "setupapi.dll,InstallHinfSection",
          "Win10Install",
          "128",
          "Z:" + `${CROSSOVER_DATA}/crossover.inf`.replaceAll("/", "\\"),
        ],
        {},
        "/dev/null",
      );
      await wine.exec(
        "rundll32",
        ["mscoree.dll,wine_install_mono"],
        {},
        "/dev/null",
      );
    }

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
