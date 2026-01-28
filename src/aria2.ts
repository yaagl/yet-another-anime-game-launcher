import { WebSocket as RPC } from "libaria2-ts";
import { log, sha256_16, wait, timeout, withTimeout } from "./utils";
import { logError, logRetry } from "./utils/structured-logging";
import { getTimeout, getRetryCount, calculateBackoff } from "./config/timeouts";
import { ConnectionError } from "./errors";

export async function createAria2({
  host,
  port,
}: {
  host: string;
  port: number;
}) {
  await wait(getTimeout("ARIA2_INITIAL_WAIT"));

  const rpc = new RPC.Client({
    host,
    port,
  });

  // Use withTimeout for proper timeout handling with Error objects
  const version = await withTimeout(
    rpc.getVersion(),
    getTimeout("ARIA2_VERSION_CHECK")
  ).catch(error => {
    throw new ConnectionError(
      `Failed to get aria2 version: ${
        error instanceof Error ? error.message : String(error)
      }`,
      host,
      port,
      { cause: error }
    );
  });

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
        throw new Error("Invalid status: " + status.status);
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

export type Aria2 = ReturnType<typeof createAria2> extends Promise<infer T>
  ? T
  : never;

export async function createAria2Retry({
  host,
  port,
}: {
  host: string;
  port: number;
}): Promise<Aria2> {
  const maxRetries = getRetryCount("ARIA2_CONNECTION");
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createAria2({ host, port });
    } catch (error) {
      lastError = error;

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        await logError(
          "Failed to create aria2 RPC after all retry attempts",
          error,
          { host, port, attempts: maxRetries }
        );
        throw new ConnectionError(
          `Failed to connect to aria2 after ${maxRetries} attempts`,
          host,
          port,
          { cause: error }
        );
      }

      // Calculate exponential backoff delay with jitter
      const delay = calculateBackoff(attempt);

      // Log retry with structured metadata
      await logRetry("aria2 connection", attempt + 1, maxRetries, error, delay);

      await wait(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new ConnectionError("Failed to connect to aria2", host, port, {
    cause: lastError,
  });
}
