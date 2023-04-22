import { readBinary } from "@utils";
import { join } from "path-browserify";

export async function getGameVersion(gameDataDir: string) {
  const ggmPath = join(gameDataDir, "globalgamemanagers");
  const view = new Uint8Array(await readBinary(ggmPath));
  const index = patternSearch(
    view,
    [
      0x69, 0x63, 0x2e, 0x61, 0x70, 0x70, 0x2d, 0x63, 0x61, 0x74, 0x65, 0x67,
      0x6f, 0x72, 0x79, 0x2e,
    ]
  );
  if (index == -1) {
    throw new Error("pattern not found"); //FIXME
  } else {
    const len = index + 120;
    const v = new DataView(view.buffer);
    const strlen = v.getUint32(len, true);
    const str = String.fromCharCode(...view.slice(len + 4, len + strlen + 4));
    return str.split("_")[0];
  }
}

function patternSearch(view: Uint8Array, pattern: number[]) {
  retry: for (let i = 0; i < view.byteLength - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (view[i + j] != pattern[j]) continue retry;
    }
    return i + pattern.length;
  }
  return -1;
}
