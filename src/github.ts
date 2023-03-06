import { log, timeout } from "./utils";

const END_POINTS = ["", "https://gh.3ss.workers.dev/"];

export async function createGithubEndpoint() {
  await log(`Checking github endpoints`);
  const fastest = await Promise.race(
    [...END_POINTS.map((prefix) =>
      fetch(`${prefix}https://api.github.com/octocat`).then(x=>x.text()).then(x=>prefix)
    ),timeout(1000)]
  );

  fastest == "" || (await log(`Using github proxy ${fastest}`));

  function api(path: `/${string}`): Promise<any> {
    return fetch(`${fastest}https://api.github.com${path}`).then(x=>x.json())
  }

  return {
    api,
  };
}

export type Github = ReturnType<typeof createGithubEndpoint> extends Promise<
  infer T
>
  ? T
  : never;
