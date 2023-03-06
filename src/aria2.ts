import { WebSocket as RPC } from "libaria2-ts";
import { wait } from "./utils";

export async function createAria2({
  host,
  port,
}: {
  host: string;
  port: number;
}) {
  const rpc = new RPC.Client({
    host,
    port,
  });

  const version = await rpc.getVersion();

  function shutdown() {
    return rpc.shutdown();
  }

  async function* doStreaming(gid: string) {
    while(true) {
      const status = await rpc.tellStatus(gid);
      if(status.status=='complete') {
        return;
      }
      yield status;
      await wait(1000);
    }
  }

  async function* doStreamingDownload(options:{
    uri:string;
    absDst: string;
  }) {
    const task = await rpc.addUri(options.uri, {
      "max-connection-per-server": 10,
      "out": options.absDst
    });
    return yield* doStreaming(task);
  }

  async function* doStreamingContinue() {

  }

  return {
    version,
    shutdown,
    doStreamingDownload
  };
}

export type Aria2 = ReturnType<typeof createAria2> extends Promise<infer T> ? T: never;
