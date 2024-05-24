import { getKey, arrayFind } from "@utils";
import { DEFAULT_WINE_DISTRO_URL, DEFAULT_WINE_DISTRO_TAG } from "../clients";
import { Github, GithubReleases } from "../github";

export async function checkWine(github: Github) {
  try {
    const wineState = await getKey("wine_state");
    if (wineState == "update") {
      return {
        wineReady: false,
        wineUpdate: await getKey("wine_update_url"),
        wineUpdateTag: await getKey("wine_update_tag"),
      } as const;
    }
    return { wineReady: true, wineTag: await getKey("wine_tag") } as const;
  } catch (e) {
    // if (await checkCrossover()) {
    //   return {
    //     wineReady: false,
    //     wineUpdate: "not_applicable",
    //     wineUpdateTag: "crossover",
    //   } as const;
    // }
    // FIXME:
    return {
      wineReady: false,
      wineUpdate: github.acceleratedPath(DEFAULT_WINE_DISTRO_URL),
      wineUpdateTag: DEFAULT_WINE_DISTRO_TAG,
    } as const;
  }
}

export async function createWineVersionChecker(github: Github) {
  function getAllReleases() {
    return github.api("/repos/3shain/wine/releases").then(x => {
      return (x as GithubReleases).map(x => {
        return {
          tag: x.tag_name,
          url: github.acceleratedPath(
            arrayFind(x.assets, x => x.name === "wine.tar.gz")
              .browser_download_url
          ),
        };
      });
    });
  }

  return {
    getAllReleases,
  };
}

export type WineVersionChecker = ReturnType<
  typeof createWineVersionChecker
> extends Promise<infer T>
  ? T
  : never;
