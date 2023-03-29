import { log, timeout } from './utils'

const END_POINTS = ['', 'https://ghp.3shain.uk/']

export async function createGithubEndpoint () {
  await log('Checking github endpoints')
  const fastest = await Promise.race([
    ...END_POINTS.map(async (prefix) =>
      await fetch(`${prefix}https://api.github.com/octocat`)
        .then(async (x) => await x.text())
        .then((x) => prefix)
    ),
    timeout(5000)
  ])

  fastest === '' || (await log(`Using github proxy ${fastest}`))

  async function api (path: `/${string}`): Promise<any> {
    return await fetch(`${fastest}https://api.github.com${path}`).then(async (x) => {
      if (x.status === 200 || x.status === 301 || x.status === 302) {
        return await x.json()
      }
      return await Promise.reject(
        new Error(`Request failed: ${x.status} ${x.statusText} (${x.url})`)
      )
    })
  }

  function acceleratedPath (path: string) {
    return `${fastest}${path}`
  }

  return {
    api,
    acceleratedPath
  }
}

export type Github = ReturnType<typeof createGithubEndpoint> extends Promise<
infer T
>
  ? T
  : never

export interface GithubReleaseInfo {
  url: string
  html_url: string
  assets_url: string
  id: number
  tag_name: string
  name: string
  body: string
  draft: boolean
  prerelease: boolean
  created_at: string
  published_at: string
  author: {}
  assets: GithubReleaseAssetsInfo[]
}

export interface GithubReleaseAssetsInfo {
  url: string
  browser_download_url: string
  id: number
  name: string
  content_type: string
}

export type GithubReleases = GithubReleaseInfo[]
