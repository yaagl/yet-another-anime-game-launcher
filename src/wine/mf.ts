import mf from "../constants/mf.reg?raw";
import wmf from "../constants/wmf.reg?raw";
import { Aria2 } from "@aria2";
import { CommonUpdateProgram } from "@common-update-ui";
import {
  humanFileSize,
  forceMove,
  removeFile,
  writeFile,
  resolve,
} from "@utils";
import { join } from "path-browserify";
import { Wine } from "./wine";

const MF_DLLS = [
  "colorcnv",
  "mf",
  "mferror",
  "mfplat",
  "mfplay",
  "mfreadwrite",
  "msmpeg2adec",
  "msmpeg2vdec",
  "sqmapi",
];

const MF_SRVS = ["colorcnv", "msmpeg2adec", "msmpeg2vdec"];

export async function* installMediaFoundation(
  aria2: Aria2,
  wine: Wine,
): CommonUpdateProgram {
  for (const dll of MF_DLLS) {
    yield ["setStateText", "DOWNLOADING_ENVIRONMENT"];
    for await (const progress of aria2.doStreamingDownload({
      uri: `https://github.com/Ultimator14/mf-install/raw/master/system32/${dll}.dll`,
      absDst: join(
        wine.prefix,
        "drive_c",
        "windows",
        "system32",
        `${dll}.dll.downloading`,
      ),
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
    await forceMove(
      join(
        wine.prefix,
        "drive_c",
        "windows",
        "system32",
        `${dll}.dll.downloading`,
      ),
      join(wine.prefix, "drive_c", "windows", "system32", `${dll}.dll`),
    );
    await wine.exec(
      "reg",
      [
        "add",
        `HKEY_CURRENT_USER\\Software\\Wine\\DllOverrides`,
        "/v",
        dll,
        "/d",
        "native",
        "/f",
      ],
      {},
      "/dev/null",
    );
  }
  yield ["setStateText", "CONFIGURING_ENVIRONMENT"];
  await writeFile("mf.reg", mf);
  await wine.exec(
    "regedit",
    [wine.toWinePath(resolve("mf.reg"))],
    {},
    "/dev/null",
  );
  await removeFile("mf.reg");
  await writeFile("wmf.reg", wmf);
  await wine.exec(
    "regedit",
    [wine.toWinePath(resolve("wmf.reg"))],
    {},
    "/dev/null",
  );
  await removeFile("wmf.reg");
  for (const srv of MF_SRVS) {
    await wine.exec("regsvr32", [`${srv}.dll`], {}, "/dev/null");
  }
}
