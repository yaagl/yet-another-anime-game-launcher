import { Locale } from "./locale";

export async function createGameInstallationDirectorySanitizer({
  openFolderDialog,
  locale,
}: {
  openFolderDialog: () => Promise<string>;
  locale: Locale;
}) {
  const HOME = await Neutralino.os.getEnv("HOME");

  async function selectPath(): Promise<string> {
    retry: while (true) {
      const path = await openFolderDialog();
      if (!path) {
        return "";
      }
      if (!path.startsWith("/")) {
        await locale.alert("PATH_INVALID", "PLEASE_SELECT_A_DIR")
        continue;
      }
      const segments = path.split("/").slice(1);
      if (path.startsWith(HOME)) {
        if (["Desktop", "Downloads", "Documents"].indexOf(segments[2]) >= 0) {
          await locale.alert("PATH_INVALID", "PATH_INVALID_FORBIDDEN_DIR")
          continue;
        }
      }
      for (const seg of segments) {
        if (/^[\x00-\x7F]*$/.test(seg)) {
          await locale.alert("PATH_INVALID", "PATH_INVALID_ASCII_ONLY")
          continue retry;
        }
      }
      return path;
    }
  }

  return {
    selectPath,
  };
}
