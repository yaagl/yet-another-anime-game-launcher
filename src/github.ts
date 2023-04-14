import { log, timeout } from "./utils";

const END_POINTS = ["", "https://ghp.3shain.uk/"];

export async function createGithubEndpoint() {
  await log(`Checking github endpoints`);
  const fastest = await Promise.race([
    ...END_POINTS.map(prefix =>
      fetch(`${prefix}https://api.github.com/octocat`)
        .then(x => x.text())
        .then(x => prefix)
        .catch(() => timeout(5000))
    ),
    timeout(5000),
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
