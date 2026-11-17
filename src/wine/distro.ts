import { exec, getKey } from "@utils";
import { coerce, gte } from "semver";
import { DEFAULT_WINE_DISTRO_TAG } from "../clients";
import { Github } from "../github";
import { D3DMETAL_RUNTIME_ID, D3DMETAL_RUNTIME_URL } from "./d3dmetal";

export interface WineDistributionAttributes {
  architecture: "x86_64" | "arm64";
  minimumMacOSVersion: string;
  renderBackend: "dxmt" | "d3dmetal";
  supportsD3d12: boolean;
  winePath: string; // Path to the wine directory inside the archive
}

export interface WineDistribution {
  id: string;
  displayName: string;
  remoteUrl: string;
  checksum?: string;
  attributes: Partial<WineDistributionAttributes> &
    Pick<WineDistributionAttributes, "architecture" | "minimumMacOSVersion">;
}

const YAAGL_BUILTIN_WINE: WineDistribution[] = [
  {
    id: "wine-11-22-alpha-1-arm64",
    displayName: "Wine 11.22 ARM64 (Alpha)",
    remoteUrl:
      "https://github.com/yaagl/anime-game-wine/releases/download/wine-11-22-alpha1/wine-11.22-alpha-1-arm64.tar.xz",
    checksum:
      "sha-256=45480533a1b4bb7cbf6d1dc2ae05dee4546b2e655dd064b661621c3efd506ba1",
    attributes: {
      architecture: "arm64",
      minimumMacOSVersion: "26.4.0",
      renderBackend: "dxmt",
      winePath: "wine",
    },
  },
  {
    id: "11.0-1-crossover-signed-experimental",
    displayName: "Wine 11.0-1 Crossover (signed, experimental)",
    remoteUrl:
      "https://github.com/yaagl/anime-game-wine/releases/download/wine-crossover-11.0-1-signed/wine-crossover-11.0-1-osx64-signed.tar.xz",
    checksum:
      "sha-256=89fa7e90fb626523a90d5867a03c6be785d017176739c6320a3b86c7838c3a35",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
      winePath: "wine",
    },
  },
  {
    id: "11.0-dxmt-signed-with-patches",
    displayName: "Wine 11.0 DXMT (signed, with patches)",
    remoteUrl:
      "https://github.com/yaagl/anime-game-wine/releases/download/wine-11.0-signed/wine-devel-11.0-osx64-signed.tar.xz",
    checksum:
      "sha-256=4ebba536115e937c3826fa5808dbed50cd5e91c8454999b54cbe0cd2a43d8b4c",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
      winePath: "wine",
    },
  },
  {
    id: "11.8-dxmt-signed-experimental",
    displayName: "Wine 11.8 DXMT (signed, experimental)",
    remoteUrl:
      "https://github.com/yaagl/anime-game-wine/releases/download/wine-11.8-signed/wine-devel-11.8-osx64-signed.tar.xz",
    checksum:
      "sha-256=42430b7e8398642d7121e7cbac0aa03ce7312b4500e4ddf7eb75a7c8f2407a9c",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
      winePath: "wine",
    },
  },
  {
    id: "11.4-dxmt-signed",
    displayName: "Wine 11.4 DXMT (signed)",
    remoteUrl:
      "https://github.com/dawn-winery/dawn-signed/releases/download/wine-gcenx-11.4-osx64/wine-devel-11.4-osx64-signed.tar.xz",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
      winePath: "wine-devel-11.4-osx64-signed/Contents/Resources/wine",
    },
  },
  {
    id: "11.0-dxmt-signed",
    displayName: "Wine 11.0 DXMT (signed)",
    remoteUrl:
      "https://github.com/dawn-winery/dawn-signed/releases/download/wine-stable-gcenx-11.0-osx64/wine-stable-11.0-osx64-signed.tar.xz",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
      winePath: "Wine Stable.app/Contents/Resources/wine",
    },
  },

  {
    id: D3DMETAL_RUNTIME_ID,
    displayName: "Wine 11.17 D3DMetal (GPTK 4.0b2, experimental)",
    remoteUrl: D3DMETAL_RUNTIME_URL,
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "d3dmetal",
      supportsD3d12: true,
      winePath: "wine",
    },
  },

  {
    id: "9.9-dxmt",
    displayName: "Wine 9.9 DXMT",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz",
    attributes: {
      architecture: "x86_64",
      minimumMacOSVersion: "15.0.0",
      renderBackend: "dxmt",
    },
  },
];

export async function getWineDistributions(): Promise<WineDistribution[]> {
  const [architecture, { stdOut: productVersion }] = await Promise.all([
    Neutralino.computer.getArch(),
    exec(["/usr/bin/sw_vers", "-productVersion"]),
  ]);
  const macOSVersion = coerce(productVersion.trim());
  if (!macOSVersion)
    throw new Error(`Invalid macOS version: ${productVersion}`);

  return YAAGL_BUILTIN_WINE.filter(
    wine =>
      (architecture === "arm" ||
        (architecture === "x64" &&
          wine.attributes.architecture === "x86_64")) &&
      gte(macOSVersion, wine.attributes.minimumMacOSVersion)
  );
}

export type WineStatus =
  | {
      wineReady: false;
      wineUpdate?: boolean;
      wineDistribution: WineDistribution;
    }
  | {
      wineReady: true;
      wineDistribution: WineDistribution;
    };

export async function checkWine(github: Github): Promise<WineStatus> {
  const wine_versions = await getWineDistributions();
  const defaultDistro = wine_versions.find(
    x => x.id == DEFAULT_WINE_DISTRO_TAG
  );
  if (!defaultDistro) {
    throw new Error(
      "can not find default wine version: " + DEFAULT_WINE_DISTRO_TAG
    );
  }
  try {
    const wineState = await getKey("wine_state");
    if (wineState == "update") {
      const update_wine_tag = await getKey("wine_update_tag");
      return {
        wineReady: false,
        wineUpdate: true,
        wineDistribution:
          wine_versions.find(x => x.id == update_wine_tag) ?? defaultDistro,
      } as const;
    }
    const currrent_wine_tag = await getKey("wine_tag");
    const wineDistribution = wine_versions.find(x => x.id == currrent_wine_tag);
    if (wineDistribution) {
      return { wineReady: true, wineDistribution } as const;
    } else {
      // Force re-install for unknown wine version
      return {
        wineReady: false,
        wineUpdate: false,
        wineDistribution: defaultDistro,
      };
    }
  } catch (e) {
    return {
      wineReady: false,
      wineUpdate: false,
      wineDistribution: defaultDistro,
    } as const;
  }
}
