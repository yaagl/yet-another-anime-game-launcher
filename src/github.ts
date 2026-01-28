import { log, wait, withTimeout, httpFetch } from "./utils";
import { logError, logRetry, logInfo } from "./utils/structured-logging";
import { getTimeout, getRetryCount, calculateBackoff } from "./config/timeouts";
import { NetworkError } from "./errors";

const END_POINTS = ["", "https://ghp.3shain.uk/"];

export async function createGithubEndpoint() {
  await log(`Checking github endpoints`);

  const maxRetries = getRetryCount("GITHUB_ENDPOINT");
  const timeoutMs = getTimeout("GITHUB_ENDPOINT");
  let fastest = "";
  let lastError: unknown;
  let hasSuccessfulConnection = false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateBackoff(attempt - 1);
        await logRetry(
          "GitHub endpoint check",
          attempt + 1,
          maxRetries,
          lastError,
          delay
        );
        await wait(delay);
      }

      const results = await withTimeout(
        Promise.allSettled(
          END_POINTS.map(async prefix => {
            const response = await httpFetch(`${prefix}https://api.github.com/octocat`, { timeout: timeoutMs });
            const text = await response.text();
            
            if (!text.includes("MMM")) {
              throw new Error("Invalid GitHub octocat response");
            }
            
            return prefix;
          })
        ),
        timeoutMs
      );

      // Find first successful endpoint
      for (const result of results) {
        if (result.status === "fulfilled") {
          fastest = result.value;
          hasSuccessfulConnection = true;
          break;
        }
      }

      if (hasSuccessfulConnection) {
        break;
      }

      // All endpoints failed, prepare for retry
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map(r => r.reason);
      lastError = errors[0] || new Error("All endpoints failed");
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries - 1) {
        await logError(
          "Failed to connect to GitHub after all retry attempts",
          error,
          { attempts: maxRetries, endpoints: END_POINTS }
        );
        throw new NetworkError(
          `Failed to connect to GitHub after ${maxRetries} attempts`,
          { cause: error }
        );
      }
    }
  }

  if (!hasSuccessfulConnection) {
    throw new NetworkError(
      "Failed to connect to GitHub: no endpoint responded"
    );
  }

  await logInfo(`Using GitHub endpoint`, { endpoint: fastest || "direct" });

  function api(path: `/${string}`): Promise<unknown> {
    return httpFetch(`${fastest}https://api.github.com${path}`).then(x => {
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
