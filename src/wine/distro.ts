import { checkCrossover } from "./crossover";
import { getKey } from "@utils";
import { DEFAULT_WINE_DISTRO_TAG } from "../clients";
import { Github } from "../github";

export interface WineDistributionAttributes {
  renderBackend: "dxmt" | "dxvk" | "gptk";
  crossover: boolean;
  whisky: boolean;
  community: boolean;
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
  {
    id: "9.9-dxvk",
    displayName: "Wine 9.9 DXVK",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/v9.9-mingw/wine.tar.gz",
    attributes: {
      renderBackend: "dxvk",
    },
  },
];

export async function getWineDistributions(): Promise<WineDistribution[]> {
  const ret = [...YAAGL_BUILTIN_WINE];

  if (await checkCrossover()) {
    ret.push(
      {
        id: "crossover",
        displayName: "CrossOver DXVK",
        remoteUrl: "n/a",
        attributes: {
          renderBackend: "dxvk",
          crossover: true,
        },
      },
      {
        id: "crossover-d3dm",
        displayName: "CrossOver D3DMetal",
        remoteUrl: "n/a",
        attributes: {
          renderBackend: "gptk",
          crossover: true,
        },
      }
    );
  }

  return ret;
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
