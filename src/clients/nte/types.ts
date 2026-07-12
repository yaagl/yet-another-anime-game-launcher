export interface VersionInfo {
  version: string;
  build: string;
  fileListUrl: string;
}

export interface ManifestInfo {
  baseUrl: string;
  productVersion: string;
  files: ManifestFile[];
}

export interface ManifestFile {
  path: string;
  size: number;
  checksum: string;
  zipSize: number;
  zipChecksum: string;
}

export interface DownloadFile {
  url: string;
  relativePath: string;
  size: number;
  checksum: string;
}