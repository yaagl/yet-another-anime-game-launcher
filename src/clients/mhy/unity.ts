import { binaryPatternSearch, md5, readBinary } from "@utils";
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
    // workaround
    const ggmMD5 = (await md5(ggmPath)).toLowerCase();
    if (ggmMD5 == "57dad95088363b87e0c1ab614fe9431c") {
      return "3.1.0";
    }
    if (ggmMD5 == "a62a4da2e7bb1b1c3fe725173b9bcd64") {
      return "3.2.0";
    }
    return "9.99.99";
  } else {
    for (let j = index; j < index + 0x80; j++) {
      if (view[j] == 0x2e && view[j + 2] == 0x2e) {
        return (
          String.fromCharCode(view[j - 1]) +
          "." +
          String.fromCharCode(view[j + 1]) +
          "." +
          String.fromCharCode(view[j + 3])
        );
      }
    }
    throw new Error("Falied to parse version");
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
