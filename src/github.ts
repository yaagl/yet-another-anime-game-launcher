import { log, timeout } from "./utils";

const END_POINTS = [
  "https://gh-proxy.com/",
  "https://ghfast.top/",
  "https://gh.llkk.cc/",
  "https://ghfile.geekertao.top/",
  "https://ghps.cc/",
  "",
];
const PROBE_URL =
  "https://github.com/yaagl/yet-another-anime-game-launcher/releases/latest/download/resources_hk4eos.neu";
const DELAY_MS = 5000;
let fastest: string | null = null;

export async function createGithubEndpoint() {
  await log(`Checking github endpoints`);
  fastest ||= await Promise.race([
    ...END_POINTS.map(prefix =>
      fetch(`${prefix}${PROBE_URL}`.trim(), {
        mode: "no-cors",
        cache: "no-cache",
        redirect: "follow",
        signal: AbortSignal.timeout(DELAY_MS),
      })
        .then(x => ([0, 200].includes(x.status) ? prefix : Promise.reject()))
        .catch(() => timeout(DELAY_MS))
    ),
    timeout(DELAY_MS),
  ]);

  fastest == "" || (await log(`Using github proxy ${fastest}`));

  function api(path: `/${string}`): Promise<unknown> {
    return fetch(`${fastest}https://api.github.com${path}`).then(x => {
      if (x.status == 200 || x.status == 301 || x.status == 302) {
        return x.json();
      }
      return Promise.reject(
        new Error(`Request failed: ${x.status} ${x.statusText} (${x.url})`)
      );
    });
  }

  function acceleratedPath(path: string) {
    return `${fastest}${path}`;
  }

  return {
    api,
    acceleratedPath,
    mirrorURL: fastest,
  };
}

export type Github = ReturnType<typeof createGithubEndpoint> extends Promise<
  infer T
>
  ? T
  : never;

export interface GithubReleaseInfo {
  url: string;
  html_url: string;
  assets_url: string;
  id: number;
  tag_name: string;
  name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  created_at: string;
  published_at: string;
  author: unknown;
  assets: GithubReleaseAssetsInfo[];
}

export interface GithubReleaseAssetsInfo {
  url: string;
  browser_download_url: string;
  id: number;
  name: string;
  content_type: string;
}

export type GithubReleases = GithubReleaseInfo[];
