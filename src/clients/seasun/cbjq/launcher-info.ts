export interface LauncherResourceData {
  version: string;
  projectVersion: string;
  pathOffset: string;
  paks: Array<{
    name: string;
    hash: string;
    sizeInBytes: number;
    bPrimary: boolean;
    base: string;
    diff: string;
    diffSizeBytes: string;
  }>;
}
