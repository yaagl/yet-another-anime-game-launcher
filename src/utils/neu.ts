import { join } from 'path-browserify'
import { build, CommandSegments, rawString } from '../command-builder'

export async function resolve (path: string): Promise<string> {
  if (path.startsWith('./')) {
    path = join(import.meta.env.PROD ? window.NL_PATH : window.NL_CWD, path)
    // await Neutralino.os.showMessageBox("1", command, "OK");
    if (!path.startsWith('/') || path === '/') { throw new Error('Assertation failed ' + path) }
  }
  return path
}

export async function exec (
  segments: CommandSegments,
  env?: { [key: string]: string },
  sudo: boolean = false,
  log_redirect: string | undefined = undefined
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = build(
    [...segments, ...(log_redirect ? [rawString('&>'), log_redirect] : [])],
    env
  )
  await log(sudo ? runInSudo(cmd) : cmd)
  const ret = await Neutralino.os.execCommand(sudo ? runInSudo(cmd) : cmd, {})
  if (ret.exitCode !== 0) {
    throw new Error(
      `Command return non-zero code\n${cmd}\nStdOut:\n${ret.stdOut}\nStdErr:\n${ret.stdErr}`
    )
  }
  return ret
}

export async function exec2 (
  segments: CommandSegments,
  env?: { [key: string]: string },
  sudo: boolean = false,
  logRedirect: string | undefined = undefined
): Promise<Neutralino.os.ExecCommandResult> {
  const cmd = build(
    [...segments, ...(logRedirect ? [rawString('&>'), logRedirect] : [])],
    env
  )
  await log(cmd)
  const { id, pid } = await Neutralino.os.spawnProcess(cmd)
  return await new Promise((res, rej) => {
    const handler: Neutralino.events.Handler<
    Neutralino.os.SpawnProcessResult
    > = (event) => {
      let stdErr = ''
      let stdOut = ''
      if (event!.detail.id === id) {
        if ((event!.detail as any).action === 'exit') {
          const exit = Number((event!.detail as any).data)
          if (exit === 0) {
            res({
              pid,
              exitCode: exit,
              stdErr,
              stdOut
            })
          } else {
            rej(
              new Error(
                `Command return non-zero code\n${cmd}\nStdOut:\n${stdOut}\nStdErr:\n${stdErr}`
              )
            )
          }

          Neutralino.events.off('spawnedProcess', handler)
        } else if ((event!.detail as any).action === 'stdOut') {
          stdOut += (event!.detail as any).data
        } else if ((event!.detail as any).action === 'stdErr') {
          stdErr += (event!.detail as any).data
        }
      }
    }
    Neutralino.events.on('spawnedProcess', handler)
  })
}

export function runInSudo (cmd: string): string {
  return build([
    'osascript',
    '-e',
    [
      'do',
      'shell',
      'script',
      `"${cmd.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`,
      'with',
      'administrator',
      'privileges'
    ].join(' ')
  ])
}

export async function tar_extract (src: string, dst: string): Promise<Neutralino.os.ExecCommandResult> {
  return await exec(['tar', '-zxvf', src, '-C', dst])
}

export async function spawn (
  segments: CommandSegments,
  env?: { [key: string]: string }
) {
  const cmd = build(segments, env)
  await log(cmd)
  const { pid, id } = await Neutralino.os.spawnProcess(cmd)
  // await Neutralino.os.
  await log(pid + '')
  await log(cmd)
  return { pid, id }
}

export async function getKey (key: string): Promise<string> {
  return await Neutralino.storage.getData(key)
}

export async function setKey (key: string, value: string | null): Promise<void> {
  return await Neutralino.storage.setData(key, value!)
}

export async function log (message: string): Promise<void> {
  return await Neutralino.debug.log(message, 'INFO')
}

export async function warn (message: string): Promise<void> {
  return await Neutralino.debug.log(message, 'WARNING')
}

export async function logerror (message: string): Promise<void> {
  return await Neutralino.debug.log(message, 'ERROR')
}

export async function restart (): Promise<void> {
  return await Neutralino.app.restartProcess()
}

export async function fatal (error: any): Promise<void> {
  await Neutralino.os.showMessageBox(
    'Fatal error',
    `${error instanceof Error ? String(error) : JSON.stringify(error)}`,
    'OK'
  )
  await shutdown()
  Neutralino.app.exit(-1)
}

export async function appendFile (path: string, content: string): Promise<void> {
  await Neutralino.filesystem.appendFile(await resolve(path), content)
}

export async function forceMove (source: string, destination: string) {
  return await exec([
    'mv',
    '-f',
    `${await resolve(source)}`,
    `${await resolve(destination)}`
  ])
}

export async function cp (source: string, destination: string) {
  return await exec([
    'cp',
    '-p',
    `${await resolve(source)}`,
    `${await resolve(destination)}`
  ])
}

export async function rmrf_dangerously (target: string) {
  return await exec(['rm', '-rf', target])
}

export async function prompt (title: string, message: string): Promise<boolean> {
  const out = await Neutralino.os.showMessageBox(title, message, 'YES_NO')
  return out === 'YES'
}

export async function alert (title: string, message: string): Promise<string> {
  return await Neutralino.os.showMessageBox(title, message, 'OK')
}

export async function openDir (title: string): Promise<string> {
  const out = await Neutralino.os.showFolderDialog(title, {})
  return out
}

export async function readBinary (path: string): Promise<ArrayBuffer> {
  return await Neutralino.filesystem.readBinaryFile(path)
}

export async function readAllLines (path: string): Promise<string[]> {
  const content = await Neutralino.filesystem.readFile(path)
  if (content.includes('\r\n')) {
    return content.split('\r\n')
  }
  return content.split('\n')
}

export async function writeBinary (path: string, data: ArrayBuffer): Promise<void> {
  return await Neutralino.filesystem.writeBinaryFile(path, data)
}

export async function writeFile (path: string, data: string): Promise<void> {
  return await Neutralino.filesystem.writeFile(path, data)
}

export async function removeFile (path: string): Promise<void> {
  return await Neutralino.filesystem.removeFile(path)
}

export async function stats (path: string): Promise<Neutralino.filesystem.Stats> {
  return await Neutralino.filesystem.getStats(path)
}

const hooks: Array<(forced: boolean) => Promise<boolean>> = []

export function addTerminationHook (fn: (forced: boolean) => Promise<boolean>): () => void {
  hooks.push(fn)
  const len = hooks.length
  return () => {
    if (hooks.length !== len) {
      throw new Error('Unexpected behavior!')
    }
    hooks.pop()
  }
}

// ??
export async function GLOBAL_onClose (forced: boolean): Promise<boolean> {
  for (const hook of hooks.reverse()) {
    if (!(await hook(forced)) && !forced) {
      return false // aborted
    }
  }
  return true
}

export async function shutdown (): Promise<void> {
  for (const hook of hooks.reverse()) {
    await hook(true)
  }
}

export async function _safeRelaunch (): Promise<void> {
  await shutdown()
  // await wait(1000);
  // HACK
  if (import.meta.env.PROD) {
    const app = await Neutralino.os.getEnv('PATH_LAUNCH')
    await Neutralino.os.execCommand(`open "${app}"`, {
      background: true
    })
    Neutralino.app.exit(0)
  } else {
    Neutralino.app.restartProcess()
  }
}
