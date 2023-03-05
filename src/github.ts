import { Octokit } from "@octokit/rest";

const END_POINTS = [
    'https://github.com',
    'https://'
]

export async function createGithubEndpoint() {
    const fastest = await Promise.race(END_POINTS.map(url=>fetch(`${url}/...`).then(x=>url)));

    const api = new Octokit({
        baseUrl: fastest
    })
    

    async function getLatest() {
        await api.repos.getLatestRelease();
        (await api.repos.downloadTarballArchive())
    }

    return {
        getLatest
    };
}

export type Github = ReturnType<typeof createGithubEndpoint> extends Promise<infer T> ? T: never;
