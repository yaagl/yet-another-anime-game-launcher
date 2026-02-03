import { log } from "@utils";
import { logError, logInfo } from "./utils/structured-logging";
import { httpFetch } from "@utils";
import { NetworkError } from "./errors";

interface GameOperationOptions {
  gamedir: string;
  game_type: string; // "hk4e" or "nap"
  tempdir?: string; // sophon manifest and intermediate files
}

export interface SophonInstallOptions extends GameOperationOptions {
  install_reltype: string; // "os", "cn", or "bb"
}

export interface SophonRepairOptions extends GameOperationOptions {
  // "quick" or "reliable"
  // "quick" does file size check, "reliable" does hash check
  repair_mode: string;
}

export interface SophonUpdateOptions extends GameOperationOptions {
  predownload: boolean;
}

interface SophonOperationResponse {
  task_id: string;
  status: string;
  message: string;
}

export interface SophonProgressEvent {
  type: string;
  task_id: string;
  [key: string]: any;
}

export interface SophonOnlineGameInfo {
  game_type: "hk4e" | "nap" | "";
  version: string;
  install_size: number;
  updatable_versions: string[];
  release_type: "os" | "cn" | "bb";
  pre_download: boolean;
  pre_download_version?: string;
  error?: string;
}

export class SophonClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(host: string, port = 6969) {
    this.baseUrl = `http://${host}:${port}`;
    this.wsUrl = this.baseUrl
      .replace("http://", "ws://")
      .replace("https://", "wss://");
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await httpFetch(`${this.baseUrl}/health`, {
        timeout: 5000,
        method: "GET",
      });
      
      if (response.status !== 200) {
        await logError("Sophon health check failed", new Error(`HTTP ${response.status}`), {
          baseUrl: this.baseUrl,
          status: response.status,
        });
        return false;
      }
      
      await response.json();
      return true;
    } catch (error) {
      await logError("Sophon health check error", error, {
        baseUrl: this.baseUrl,
      });
      return false;
    }
  }

  async startGameOperation(
    type: "install" | "repair" | "update",
    options: SophonInstallOptions | SophonRepairOptions | SophonUpdateOptions
  ): Promise<string> {
    // Note: httpFetch doesn't support POST body yet, using fetch for POST requests
    const response = await fetch(`${this.baseUrl}/api/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new NetworkError(
        `${type} request failed: ${response.statusText}`,
        { metadata: { type, status: response.status } }
      );
    }

    const result: SophonOperationResponse = await response.json();
    return result.task_id;
  }

  async startInstallation(options: SophonInstallOptions): Promise<string> {
    return this.startGameOperation("install", options);
  }

  async startRepair(options: SophonRepairOptions): Promise<string> {
    return this.startGameOperation("repair", options);
  }

  async startUpdate(options: SophonUpdateOptions): Promise<string> {
    return this.startGameOperation("update", options);
  }

  async *streamOperationProgress(
    taskId: string
  ): AsyncGenerator<SophonProgressEvent> {
    const ws = new WebSocket(`${this.wsUrl}/ws/${taskId}`);

    const messageQueue: SophonProgressEvent[] = [];
    let isConnected = false;
    let isCompleted = false;
    let error: string | null = null;
    let messageResolver: ((value: unknown) => void) | null = null;

    ws.onopen = () => {
      isConnected = true;
    };

    ws.onmessage = event => {
      const message = JSON.parse(event.data) as SophonProgressEvent;
      messageQueue.push(message);

      if (messageResolver) {
        messageResolver(null);
      }

      if (
        message.type === "job_end" ||
        message.type === "job_error" ||
        message.type === "error"
      ) {
        isCompleted = true;
        if (message.type === "job_error" || message.type === "error") {
          error = message.error || "Unknown error";
        }
      }
    };

    ws.onerror = event => {
      error = "WebSocket connection error";
      isCompleted = true;
    };

    ws.onclose = () => {
      isCompleted = true;
    };

    // Wait for connection
    while (!isConnected && !error) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (error) {
      throw new Error(error);
    }

    while (!isCompleted || messageQueue.length > 0) {
      if (messageQueue.length > 0) {
        // Array is not empty. message is not null.
        const message = messageQueue.shift()!;
        yield message;

        if (message.type === "error" || message.type === "job_error") {
          throw new Error(message.error || "Operation failed");
        }
      } else {
        await new Promise(resolve => {
          messageResolver = resolve;
        });
      }
    }

    ws.close();
  }

  async cancelOperation(taskId: string): Promise<void> {
    // Note: DELETE operations use fetch as httpFetch focuses on GET/POST
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new NetworkError(
        `Failed to cancel operation: ${response.statusText}`,
        { metadata: { taskId, status: response.status } }
      );
    }
  }

  async getLatestOnlineGameInfo(
    reltype: "os" | "cn" | "bb",
    game: string
  ): Promise<SophonOnlineGameInfo> {
    const response = await httpFetch(
      `${this.baseUrl}/api/game/online_info?game=${game}&reltype=${reltype}`,
      { timeout: 15000 }
    );

    if (response.status !== 200) {
      throw new NetworkError(
        `Failed to get game info: ${response.statusText}`,
        { metadata: { game, reltype, status: response.status } }
      );
    }

    return response.json();
  }
}

export async function createSophon(
  host: string,
  port: number
): Promise<SophonClient> {
  const client = new SophonClient(host, port);

  if (!(await client.healthCheck())) {
    throw new Error(`Failed to connect to Sophon server at ${host}:${port}`);
  }
  return client;
}

export type Sophon = SophonClient;

export async function createSophonRetry(
  host: string,
  port: number
): Promise<Sophon> {
  const maxRetries = 10;
  const baseDelay = 500; // 500ms base delay
  const maxDelay = 5000; // 5s max delay

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await createSophon(host, port);
    } catch (error) {
      if (attempt === maxRetries - 1) {
        logError("Failed to create Sophon client after all retries", {
          host,
          port,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
        });
        throw new NetworkError(
          "Failed to create Sophon client after retries",
          { metadata: { host, port, maxRetries } }
        );
      }

      // Exponential backoff with jitter
      const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = exponentialDelay + jitter;

      logInfo("Retrying Sophon connection", {
        attempt: attempt + 1,
        maxRetries,
        nextAttemptIn: Math.round(delay),
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new NetworkError("Failed to create Sophon client", {
    metadata: { host, port },
  });
}
