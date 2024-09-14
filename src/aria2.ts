import { WebSocket as RPC } from "libaria2-ts";
import { log, sha256_16, wait } from "./utils";

export async function createAria2({
  host,
  port,
}: {
  host: string;
  port: number;
}) {
  await wait(500); // FIXME:
  const rpc = new RPC.Client({
    host,
    port,
  });
  const version = await rpc.getVersion();

  function shutdown() {
    return rpc.shutdown();
  }

  async function* doStreaming(gid: string) {
    while (true) {
      const status = await rpc.tellStatus(gid);
      if (status.status == "complete") {
        break;
      }
      if (status.totalLength == BigInt(0)) {
        continue;
      }
      yield status;
      await wait(100);
    }
  }

  async function* doStreamingDownload(options: {
    uri: string;
    absDst: string;
  }) {
    const gid = await sha256_16(`${options.uri}:${options.absDst}`);
    try {
      const status = await rpc.tellStatus(gid);
      if (status.status == "paused") {
        await rpc.unpause(gid);
      } else if (status.status == "complete") {
        return;
      } else {
        throw new Error("FIXME: implmenet me (aria2.ts) " + status.status);
      }
    } catch (e: unknown) {
      if (typeof e == "object" && e != null && "code" in e && e["code"] == 1) {
        await rpc.addUri(options.uri, {
          gid,
          "max-connection-per-server": 16,
          out: options.absDst,
          continue: false,
          "allow-overwrite": true, // in case control file broken
        });
      } else {
        throw e;
      }
    }
    return yield* doStreaming(gid);
  }

  return {
    version,
    shutdown,
    doStreamingDownload,
  };
}

export type Aria2 =
  ReturnType<typeof createAria2> extends Promise<infer T> ? T : never;
