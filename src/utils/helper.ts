export async function waitImageReady(url: string) {
  return new Promise((res, rej) => {
    const image = new Image();
    image.src = url;
    image.onload = res;
    image.onerror = rej;
  });
}

export function timeout(ms: number): Promise<never> {
  return new Promise((_, rej) => {
    setTimeout(() => {
      rej("TIMEOUT");
    }, ms);
  });
}

export function wait(ms: number): Promise<number> {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(ms);
    }, ms);
  });
}

export async function sha256_16(str: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return Array.prototype.map
    .call(new Uint8Array(buf), x => ("00" + x.toString(16)).slice(-2))
    .slice(0, 8)
    .join("");
}

export function formatString(str: string, intrp: string[]) {
  return `${str}`.replace(/{(\d+)}/g, function (match, number) {
    return typeof intrp[number] != "undefined" ? intrp[number] : match;
  });
}

// https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string
/* Format bytes as human-readable text.
 *
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 *
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }

  const units = si
    ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
    : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (
    Math.round(Math.abs(bytes) * r) / r >= thresh &&
    u < units.length - 1
  );

  return bytes.toFixed(dp) + " " + units[u];
}

export function assertValueDefined<V>(
  value: V,
): asserts value is NonNullable<V> {
  if (value === null || value === undefined) {
    throw new Error("Assertation failed: value is either null or undefined.");
  }
}

export function arrayFind<T>(
  array: Array<T>,
  predict: (value: T) => boolean,
): T {
  const ret = array.find(predict);
  if (ret === undefined) {
    throw new Error("Assertation failed: can not find element in array");
  }
  return ret;
}

export function binaryPatternSearch(view: Uint8Array, pattern: number[]) {
  retry: for (let i = 0; i < view.byteLength - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (view[i + j] != pattern[j]) continue retry;
    }
    return i;
  }
  return -1;
}

// by New Bing
export function generateRandomString(n: number) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * chars.length);
    const char = chars.charAt(index);
    result += char;
  }
  return result;
}
