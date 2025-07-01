import { log } from "@utils";

export interface SophonInstallOptions {
  gamedir: string;
  install_reltype: string; // "os", "cn", or "bb"
}

export interface SophonProgressEvent {
  type: string;
  task_id: string;
  [key: string]: any;
}

export class SophonClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(baseUrl = "http://localhost:8000") {
    this.baseUrl = baseUrl;
    this.wsUrl = baseUrl.replace("http://", "ws://").replace("https://", "wss://");
  }

  async startInstallation(options: SophonInstallOptions): Promise<string> {
    log("djuafkla")
    log(`Starting installation with options: ${JSON.stringify(options)}`);

    const response = await fetch(`${this.baseUrl}/api/install`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    log(`Installation response status: ${response.status}`);

    if (!response.ok) {
      throw new Error(`Installation request failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.task_id;
  }

  async* streamInstallationProgress(taskId: string): AsyncGenerator<SophonProgressEvent> {
    const ws = new WebSocket(`${this.wsUrl}/ws/${taskId}`);

    const messageQueue: SophonProgressEvent[] = [];
    let isConnected = false;
    let isCompleted = false;
    let error: string | null = null;

    ws.onopen = () => {
      isConnected = true;
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as SophonProgressEvent;
      messageQueue.push(message);

      if (message.type === 'download_end' || message.type === 'download_error') {
        isCompleted = true;
        if (message.type === 'download_error') {
          error = message.error || 'Unknown error';
        }
      }
    };

    ws.onerror = (event) => {
      error = 'WebSocket connection error';
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

    // Yield messages as they arrive
    while (!isCompleted || messageQueue.length > 0) {
      if (messageQueue.length > 0) {
        const message = messageQueue.shift()!;
        yield message;

        if (message.type === 'error') {
          throw new Error(message.error || 'Installation failed');
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    ws.close();
  }

  async cancelInstallation(taskId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/tasks/${taskId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel installation: ${response.statusText}`);
    }
  }

  async getGameInfo(gamedir: string) {
    const response = await fetch(`${this.baseUrl}/api/game/info?gamedir=${encodeURIComponent(gamedir)}`);

    if (!response.ok) {
      throw new Error(`Failed to get game info: ${response.statusText}`);
    }

    return response.json();
  }
}

export async function createSophon({
                                     baseUrl = "http://localhost:8000"
                                   }: {
  baseUrl?: string;
} = {}): Promise<SophonClient> {
  const client = new SophonClient(baseUrl);

  // Test connection
  try {
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
  } catch (error) {
    throw new Error(`Failed to connect to Sophon server: ${error}`);
  }

  return client;
}

export type Sophon = SophonClient;

export async function createSophonRetry({
                                          baseUrl = "http://localhost:8000"
                                        }: {
  baseUrl?: string;
} = {}): Promise<Sophon> {
  for (let i = 0; i < 10; i++) {
    try {
      return await createSophon({ baseUrl });
    } catch (error) {
      console.log("Failed to create sophon client, retrying...", error);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Failed to create sophon client after retries");
}
