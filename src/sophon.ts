import { log } from "@utils";

interface GameOperationOptions {
  gamedir: string;
  game_type: string // "hk4e" or "nap"
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
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        log(`Health check failed with status: ${response.status}`);
        return false;
      }
      await response.json();
      return true;
    } catch (error) {
      log(`Health check error: ${error}`);
      return false;
    }
  }

  async startGameOperation(
    type: "install" | "repair" | "update",
    options: SophonInstallOptions | SophonRepairOptions | SophonUpdateOptions
  ): Promise<string> {
    log(`Starting ${type} operation with options: ${JSON.stringify(options)}`);

    const response = await fetch(`${this.baseUrl}/api/${type}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(options),
    });

    if (!response.ok) {
      throw new Error(`${type} request failed: ${response.statusText}`);
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
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
    // Partial support at python server side
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel operation: ${response.statusText}`);
    }
  }

  async getLatestOnlineGameInfo(reltype: "os" | "cn" | "bb", game: string) {
    // Currently only supports "hk4e" for game, "os", "cn", or "bb" for reltype
    const response = await fetch(
      `${this.baseUrl}/api/game/online_info?game=${game}&reltype=${reltype}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get game info: ${response.statusText}`);
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
  for (let i = 0; i < 10; i++) {
    try {
      return await createSophon(host, port);
    } catch (error) {
      log("Failed to create sophon client, retrying..." + error);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  throw new Error("Failed to create sophon client after retries");
}
