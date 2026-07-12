import {
  VERSION_INFO_URL,
  BACKUP_VERSION_INFO_URL,
} from "./constants";

import type {
  VersionInfo,
  ManifestInfo,
  ManifestFile,
  DownloadFile,
} from "./types";

export async function getVersionInfo(): Promise<VersionInfo> {
  const urls = [
    VERSION_INFO_URL,
    BACKUP_VERSION_INFO_URL,
  ];

  let text = "";

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        continue;
      }

      text = await response.text();
      break;
    } catch {
      continue;
    }
  }

  if (text === "") {
    throw new Error("Failed to download Version.ini");
  }

  const version =
    text.match(/^Version=(.+)$/m)?.[1] ?? "";

  const build =
    text.match(/^Build=(.+)$/m)?.[1] ?? "";

  const fileListUrl =
    text.match(/^FileListURL=(.+)$/m)?.[1] ?? "";

  if (!version || !fileListUrl) {
    throw new Error("Invalid Version.ini");
  }

  return {
    version,
    build,
    fileListUrl,
  };
}

export async function downloadManifest(
  version: VersionInfo
): Promise<string> {
  const response = await fetch(version.fileListUrl);

  if (!response.ok) {
    throw new Error("Failed to download AllFiles.xml");
  }

  return await response.text();
}

export function parseManifest(xml: string): ManifestInfo {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml, "application/xml");

  const url =
    document.querySelector("Url");

  const product =
    document.querySelector("ProductVersion");

  if (!url || !product) {
    throw new Error("Invalid manifest");
  }

  const baseUrl =
    url.getAttribute("BaseUrl") ?? "";

  const productVersion =
    product.getAttribute("Version") ?? "";

  const files: ManifestFile[] = [];

  document
    .querySelectorAll("File")
    .forEach((node) => {
      files.push({
        path:
          node.getAttribute("Path") ?? "",

        size:
          Number(node.getAttribute("Size") ?? "0"),

        checksum:
          node.getAttribute("Checksum") ?? "",

        zipSize:
          Number(node.getAttribute("ZipSize") ?? "0"),

        zipChecksum:
          node.getAttribute("ZipChecksum") ?? "",
      });
    });

  return {
    baseUrl,
    productVersion,
    files,
  };
}

export function buildDownloadList(
  manifest: ManifestInfo
): DownloadFile[] {
  return manifest.files.map((file) => ({
    url:
      `${manifest.baseUrl}/${manifest.productVersion}${file.path}.zip`,

    relativePath: file.path,

    size: file.size,

    checksum: file.checksum,
  }));
}