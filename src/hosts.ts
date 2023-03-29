import { rawString } from './command-builder'
import { exec, readAllLines } from './utils'

export async function ensureHosts (hosts: Array<[string, string]>) {
  const content = await readAllLines('/etc/hosts')
  let start = 0
  while (start < content.length && content[start] !== '# Added by Yaagl') {
    start++
  }
  let end = start
  while (end < content.length && content[end] !== '# End of section') {
    end++
  }
  const newContentPre = content.filter((_, index) => {
    return index < start
  })
  const newContentPost = content.filter((_, index) => {
    return index > end
  })
  const newContent = [
    ...newContentPre,
    '# Added by Yaagl',
    ...hosts.map(([domain, ip]) => `${ip} ${domain}`),
    '# End of section',
    ...((newContentPost.length > 0) ? newContentPost : [''])
  ]
  const contentsss = newContent.join('\n')
  await exec(['printf', contentsss, rawString('>'), '/etc/hosts'], {}, true)
}
