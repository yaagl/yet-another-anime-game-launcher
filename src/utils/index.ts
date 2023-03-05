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