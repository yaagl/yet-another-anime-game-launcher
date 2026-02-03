import { WebSocket as RPC } from "libaria2-ts";
import { log, sha256_16, wait, timeout, withTimeout, stats } from "./utils";
import { logError, logRetry } from "./utils/structured-logging";
import { getTimeout, getRetryCount, calculateBackoff } from "./config/timeouts";
import { ConnectionError } from "./errors";

/**
 * Extension del status de aria2 con métricas de escritura a disco
 */
export interface Aria2StreamStatus {
  // Metrics from aria2 RPC
  status: string;
  totalLength: bigint;
  completedLength: bigint;
  downloadSpeed: bigint;
  uploadSpeed?: bigint;
  
  // Calculated metrics for disk performance
  diskWriteSpeed: bigint;  // bytes/second written to disk
  lastDiskUpdate: number;  // timestamp of last disk check
  isDiskBottleneck: boolean;  // true if disk speed < 90% of network speed
}

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

  // Track disk metrics per download
  const diskMetrics = new Map<string, {
    lastSize: bigint;
    lastTime: number;
    diskSpeed: bigint;
    speedSamples: bigint[];
  }>();

  /**
   * Calculate disk write speed by checking file size changes
   */
  async function calculateDiskSpeed(absDst: string, gid: string): Promise<{speed: bigint, isBotleneck: boolean}> {
    try {
      const stat = await stats(absDst);
      const currentSize = BigInt(stat.size);
      const now = Date.now();
      
      let metrics = diskMetrics.get(gid);
      if (!metrics) {
        metrics = { lastSize: currentSize, lastTime: now, diskSpeed: BigInt(0), speedSamples: [] };
        diskMetrics.set(gid, metrics);
        return { speed: BigInt(0), isBotleneck: false };
      }
      
      const timeDeltaMs = now - metrics.lastTime;
      if (timeDeltaMs < 500) {
        // Too soon, return last known speed
        return { 
          speed: metrics.diskSpeed, 
          isBotleneck: false 
        };
      }
      
      const bytesWritten = currentSize - metrics.lastSize;
      const secondsDelta = timeDeltaMs / 1000;
      const speed = secondsDelta > 0 ? bytesWritten / BigInt(Math.ceil(secondsDelta)) : BigInt(0);
      
      // Keep rolling average of last 3 samples for stability
      metrics.speedSamples.push(speed);
      if (metrics.speedSamples.length > 3) {
        metrics.speedSamples.shift();
      }
      const avgSpeed = metrics.speedSamples.length > 0 
        ? metrics.speedSamples.reduce((a, b) => a + b, BigInt(0)) / BigInt(metrics.speedSamples.length)
        : speed;
      
      metrics.lastSize = currentSize;
      metrics.lastTime = now;
      metrics.diskSpeed = avgSpeed;
      
      return { speed: avgSpeed, isBotleneck: false };
    } catch {
      // File doesn't exist yet or stats failed
      return { speed: BigInt(0), isBotleneck: false };
    }
  }

  async function* doStreaming(gid: string, absDst?: string) {
    while (true) {
      const status = await rpc.tellStatus(gid);
      if (status.status == "complete") {
        // Cleanup metrics
        diskMetrics.delete(gid);
        break;
      }
      if (status.totalLength == BigInt(0)) {
        continue;
      }
      
      // Calculate disk metrics if file path provided
      let diskWriteSpeed = BigInt(0);
      let isDiskBottleneck = false;
      
      if (absDst) {
        const { speed, isBotleneck } = await calculateDiskSpeed(absDst, gid);
        diskWriteSpeed = speed;
        
        // Check if disk is bottleneck (disk speed < 90% of network speed)
        if (status.downloadSpeed > BigInt(0) && speed < (status.downloadSpeed * BigInt(90)) / BigInt(100)) {
          isDiskBottleneck = true;
        }
      }
      
      yield {
        ...status,
        diskWriteSpeed,
        lastDiskUpdate: Date.now(),
        isDiskBottleneck,
      } as Aria2StreamStatus;
      
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
    return yield* doStreaming(gid, options.absDst);
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
