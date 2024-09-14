import { checkCrossover } from "./crossover";
import { checkWhisky } from "./whisky";
import { getKey } from "@utils";
import { DEFAULT_WINE_DISTRO_TAG } from "../clients";
import { Github } from "../github";

export interface WineDistributionAttributes {
  renderBackend: "dxmt" | "dxvk" | "gptk";
  crossover: boolean;
  whisky: boolean;
  community: boolean;
}

export interface WineDistribution {
  id: string;
  displayName: string;
  remoteUrl: string;
  attributes: Partial<WineDistributionAttributes>;
}

const YAAGL_BUILTIN_WINE: WineDistribution[] = [
  {
    id: "9.9-dxmt",
    displayName: "Wine 9.9 DXMT (Experimental)",
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
  {
    id: "v8.16-3shain",
    displayName: "Wine 8.17 DXVK",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/v8.16-3shain/wine.tar.gz",
    attributes: {
      renderBackend: "dxvk",
    },
  },
  {
    id: "v9.2-mingw",
    displayName: "Wine 9.2 DXVK",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/v9.2-mingw/wine.tar.gz",
    attributes: {
      renderBackend: "dxvk",
    },
  },
  {
    id: "unstable-bh-gptk-1.0",
    displayName: "GPTK",
    remoteUrl:
      "https://github.com/3Shain/wine/releases/download/unstable-bh-gptk-1.0/wine.tar.gz",
    attributes: {
      renderBackend: "gptk",
    },
  },
  {
    id: "community-hsr-gptk",
    displayName: "GPTK (Community Ver.)",
    remoteUrl:
      "https://github.com/1146839821/wine/releases/download/0.0.1/wine.tar.gz",
    attributes: {
      renderBackend: "gptk",
      community: true,
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
      },
    );
  }

  if (await checkWhisky()) {
    ret.push(
      {
        id: "whisky-dxvk",
        displayName: "Whisky DXVK",
        remoteUrl: "n/a",
        attributes: {
          renderBackend: "dxvk",
          whisky: true,
        },
      },
      {
        id: "whisky",
        displayName: "Whisky D3DMetal",
        remoteUrl: "n/a",
        attributes: {
          renderBackend: "gptk",
          whisky: true,
        },
      },
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
    x => x.id == DEFAULT_WINE_DISTRO_TAG,
  );
  if (!defaultDistro) {
    throw new Error(
      "can not find default wine version: " + DEFAULT_WINE_DISTRO_TAG,
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
      return {
        wineReady: true,
        wineDistribution: {
          id: currrent_wine_tag,
          displayName: currrent_wine_tag,
          remoteUrl: "",
          attributes: {}, // FIXME: old version compatibility (or force update)
        },
      };
    }
  } catch (e) {
    return {
      wineReady: false,
      wineDistribution: defaultDistro,
    } as const;
  }
}
