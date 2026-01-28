import { getKey } from "@utils";
import { DEFAULT_WINE_DISTRO_TAG } from "../clients";
import { Github } from "../github";

export interface WineDistributionAttributes {
  renderBackend: "dxmt";
  winePath: string; // Path to the wine directory inside the archive
}

export interface WineDistribution {
  id: string;
  displayName: string;
  remoteUrl: string;
  attributes: Partial<WineDistributionAttributes>;
}

const YAAGL_BUILTIN_WINE: WineDistribution[] = [
  {
    id: "11.0-dxmt-signed",
    displayName: "Wine 11.0 DXMT (signed)",
    remoteUrl:
      "https://github.com/dawn-winery/dawn-signed/releases/download/wine-stable-gcenx-11.0-osx64/wine-stable-11.0-osx64-signed.tar.xz",
    attributes: {
      renderBackend: "dxmt",
      winePath: "Wine Stable.app/Contents/Resources/wine",
    },
  },
  {
    id: "10.18-dxmt",
    displayName: "Wine 10.18 DXMT Experimental",
    remoteUrl:
      "https://github.com/Gcenx/macOS_Wine_builds/releases/download/10.18/wine-devel-10.18-osx64.tar.xz",
    attributes: {
      renderBackend: "dxmt",
      winePath: "Wine Devel.app/Contents/Resources/wine",
    },
  },
  {
    id: "9.9-dxmt",
    displayName: "Wine 9.9 DXMT",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz",
    attributes: {
      renderBackend: "dxmt",
    },
  },
];

export async function getWineDistributions(): Promise<WineDistribution[]> {
  return YAAGL_BUILTIN_WINE;
}

export type WineStatus =
  | {
      wineReady: false;
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
        wineDistribution: defaultDistro,
      };
    }
  } catch (e) {
    return {
      wineReady: false,
      wineDistribution: defaultDistro,
    } as const;
  }
}
