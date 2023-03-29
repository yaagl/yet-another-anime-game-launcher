import { join } from 'path-browserify'
import { Aria2 } from '../aria2'
import { CommonUpdateProgram } from '../common-update-ui'
import { log, md5, stats, readAllLines, setKey } from '../utils'

export
async function * checkIntegrityProgram ({
  gameDir,
  remoteDir,
  aria2
}: {
  gameDir: string
  remoteDir: string
  aria2: Aria2
}): CommonUpdateProgram {
  const entries: Array<{
    remoteName: string
    md5: string
    fileSize: number
  }> = (await readAllLines(join(gameDir, 'pkg_version')))
    .filter((x) => x.trim() != '')
    .map((x) => JSON.parse(x))
  const toFix: Array<{
    remoteName: string
    md5: string
  }> = []
  let count = 0
  yield [
    'setStateText',
    'SCANNING_FILES',
    String(count),
    String(entries.length)
  ]
  for (const entry of entries) {
    const localPath = join(gameDir, entry.remoteName)
    try {
      const fileStats = await stats(localPath)
      if (fileStats.size !== entry.fileSize) {
        throw new Error('Size not match')
      }
      const md5sum = await md5(localPath)
      if (md5sum !== entry.md5) {
        await log(`${md5sum} ${entry.md5} not match`)
        throw new Error('Md5 not match')
      }
    } catch {
      toFix.push(entry)
    }
    count++
    yield [
      'setStateText',
      'SCANNING_FILES',
      String(count),
      String(entries.length)
    ]
    yield ['setProgress', (count / entries.length) * 100]
  }
  setKey('patched', null)
  if (toFix.length == 0) {
    return
  }
  yield ['setUndeterminedProgress']

  yield ['setStateText', 'FIXING_FILES', String(count), String(toFix.length)]
  count = 0
  for (const entry of toFix) {
    const localPath = join(gameDir, entry.remoteName)
    const remotePath = join(remoteDir, entry.remoteName).replace(':/', '://') // ....join: wtf?
    await log(remotePath)
    await log(localPath)
    for await (const progress of aria2.doStreamingDownload({
      uri: remotePath,
      absDst: localPath
    })) {
      yield [
        'setStateText',
        'FIXING_FILES',
        String(count),
        String(toFix.length)
      ]
      yield [
        'setProgress',
        Number((progress.completedLength * BigInt(100)) / progress.totalLength)
      ]
    }
    count++
    // yield ['setStateText', 'COMPLETE_FILE', count, toFix.length]
  }
}
