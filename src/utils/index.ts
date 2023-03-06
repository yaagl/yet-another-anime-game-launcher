export * from "./neu";

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
    new TextEncoder().encode(str)
  );
  return Array.prototype.map
    .call(new Uint8Array(buf), (x) => ("00" + x.toString(16)).slice(-2))
    .slice(0, 8)
    .join("");
}
