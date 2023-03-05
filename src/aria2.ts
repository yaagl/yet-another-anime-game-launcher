import { WebSocket as AWS } from "libaria2-ts";
import { wait } from "./utils";

export async function createAria2({
  host,
  port,
}: {
  host: string;
  port: number;
}) {
  const aws = new AWS.Client({
    host,
    port,
  });

  const version = await aws.getVersion();

  function shutdown() {
    return aws.shutdown();
  }

  async function* doStreaming(gid: string) {
    while(true) {
      const status = await aws.tellStatus(gid);
      if(status.status=='complete') {
        return;
      }
      yield status;
      await wait(1000);
    }
  }

  async function* doStreamingDownload(options:{
    uri:string;
    dst: string;
  }) {
    const task = await aws.addUri(options.uri, {
      "max-connection-per-server": 10
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
