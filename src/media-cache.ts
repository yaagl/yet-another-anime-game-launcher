import { join } from "path-browserify";
import type { Aria2 } from "@aria2";
import {
  createDirIfNeeded,
  log,
  readBinary,
  resolve,
  sha256_16,
  stats,
  writeBinary,
} from "@utils";

const mediaCacheDir = "./media-cache";
const pendingDownloads = new Map<string, Promise<void>>();

function extensionForUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const ext = pathname.match(/\.([a-zA-Z0-9]{2,5})$/)?.[0];
    return ext ?? ".bin";
  } catch {
    return ".bin";
  }
}

async function getCachePath(url: string) {
  const hash = await sha256_16(url);
  return join(mediaCacheDir, `${hash}${extensionForUrl(url)}`);
}

function getMimeType(ext: string) {
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".bmp") return "image/bmp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  return "";
}

async function localFileUrl(path: string, originalUrl: string) {
  try {
    const data = await readBinary(path);
    const ext = path.match(/\.([a-zA-Z0-9]{2,5})$/)?.[0]?.toLowerCase() || ".bin";
    const mime = getMimeType(ext);
    const blob = new Blob([data], { type: mime });
    
    // Convert Blob to Base64 Data URI to avoid blob: URL restrictions in CSS
    const dataUrl = await new Promise<string>((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = () => rej(new Error("FileReader failed"));
      reader.readAsDataURL(blob);
    });
    
    return dataUrl;
  } catch (e) {
    log(`Failed to read cached file ${path}: ${e}`);
    return originalUrl;
  }
}

async function downloadToCache(
  url: string,
  cachePath: string,
  aria2?: Aria2
) {
  if (pendingDownloads.has(url)) return pendingDownloads.get(url);

  const job = (async () => {
    await createDirIfNeeded(mediaCacheDir).catch(() => undefined);
    if (aria2) {
      for await (const _ of aria2.doStreamingDownload({
        uri: url,
        absDst: resolve(cachePath),
      })) {
        // Consume the stream so aria2 can finish the background cache job.
      }
    } else {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to cache media ${response.status}: ${url}`);
      }
      await writeBinary(cachePath, await response.arrayBuffer());
    }
  })()
    .catch(error => log(`Media cache failed: ${error}`))
    .finally(() => pendingDownloads.delete(url));

  pendingDownloads.set(url, job);
  return job;
}

export async function getCachedMediaUrl(url: string | undefined, aria2?: Aria2) {
  if (!url || url.startsWith("/") || url.startsWith("./") || url.startsWith("blob:")) return url;

  const cachePath = await getCachePath(url);
  try {
    const cached = await stats(cachePath);
    if (cached.isFile && cached.size > 0) {
      if (cached.size > 15 * 1024 * 1024) {
        // File is too large (>15MB). Reading it into memory will crash Neutralino WebSocket.
        // We fallback to the original HTTP URL for videos.
        return url;
      }
      return await localFileUrl(cachePath, url);
    }
  } catch {
    downloadToCache(url, cachePath, aria2);
  }

  return url;
}
