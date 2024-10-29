import { binaryPatternSearch, readBinary } from "@utils";
import { join } from "path-browserify";

export async function getGameVersion(gameDataDir: string, offset = 0x88) {
  const ggmPath = join(gameDataDir, "globalgamemanagers");
  const view = new Uint8Array(await readBinary(ggmPath));
  const index = binaryPatternSearch(
    view,
    [
      0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67,
      0x6f, 0x72, 0x79, 0x2e,
    ]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    const len = index + offset;
    const v = new DataView(view.buffer);
    const strlen = v.getUint32(len, true);
    const str = String.fromCharCode(...view.slice(len + 4, len + strlen + 4));
    return str.split("_")[0];
  }
}

export async function getGameVersion2019(gameDataDir: string) {
  const ggmPath = join(gameDataDir, "data.unity3d");
  const view = new Uint8Array(await readBinary(ggmPath));
  const index = binaryPatternSearch(
    view,
    [0x63, 0x61, 0x74, 0x65, 0x67, 0x6f, 0x72, 0x79]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    let str = "";
    let offset = 0;
    try {
      for (let i = 0; i < 3; i++) {
        for (;;) {
          const w = view[index + 0x40 + offset];
          if (w - 48 == -2) {
            // dot
            str += ".";
            offset++;
            break;
          } else if (w - 48 >= 0 && w - 48 < 10) {
            // decimal
            str += String.fromCharCode(w);
            offset++;
            continue;
          } else if (i == 2) {
            return str;
          } else {
            throw new Error("Falied to parse version");
          }
        }
      }
    } catch {
      // second attempt
      for (let i = 0; i < 3; i++) {
        for (;;) {
          const w = view[index + 0x35 + offset];
          if (w - 48 == -2) {
            // dot
            str += ".";
            offset++;
            break;
          } else if (w - 48 >= 0 && w - 48 < 10) {
            // decimal
            str += String.fromCharCode(w);
            offset++;
            continue;
          } else if (i == 2) {
            return str;
          } else {
            throw new Error("Falied to parse version");
          }
        }
      }
    }
    throw new Error("Assertation: unreachable");
  }
}

export async function disableUnityFeature(ggmPath: string) {
  const view = new Uint8Array(await readBinary(ggmPath));
  const index = binaryPatternSearch(
    view,
    [
      0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67,
      0x6f, 0x72, 0x79, 0x2e,
    ]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    const len = index + 24;
    const v = new DataView(view.buffer);
    v.setInt32(len, 0, true);
    return view.buffer;
  }
}
