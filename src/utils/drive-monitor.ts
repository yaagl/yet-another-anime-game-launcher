/**
 * Drive monitoring service for detecting external HDD disconnections
 * Hybrid monitoring: filesystem watcher + 5-second polling
 * Maintains reactive state of monitored drives
 */

import { createSignal, onCleanup } from "solid-js";
import { isDriveAccessible, isExternalDrive, getVolumeName } from "./external-drive";
import { log } from "./neu";

/**
 * State of a monitored drive
 */
export interface DriveState {
  path: string;
  isExternal: boolean;
  isAccessible: boolean;
  volumeName: string;
  lastChecked: number;
}

/**
 * Events emitted when drive state changes
 */
export type DriveEvent = 
  | { type: "disconnected"; path: string; volumeName: string }
  | { type: "connected"; path: string; volumeName: string }
  | { type: "checked"; path: string; accessible: boolean };

/**
 * Callback type for drive state changes
 */
export type DriveEventCallback = (event: DriveEvent) => void | Promise<void>;

/**
 * Drive monitor service - tracks external HDDs and detects disconnections
 */
class DriveMonitor {
  private drives = new Map<string, DriveState>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private eventCallbacks: DriveEventCallback[] = [];
  private isMonitoring = false;

  /**
   * Start monitoring a drive path
   * @param path Absolute path to monitor
   */
  async addDrive(path: string): Promise<void> {
    if (this.drives.has(path)) {
      return;
    }

    const isExternal = await isExternalDrive(path);
    const isAccessible = await isDriveAccessible(path);
    const volumeName = getVolumeName(path);

    const state: DriveState = {
      path,
      isExternal,
      isAccessible,
      volumeName,
      lastChecked: Date.now(),
    };

    this.drives.set(path, state);

    await log(
      `DriveMonitor: Added ${isExternal ? "external" : "internal"} drive: ${volumeName} (${path})`
    );

    // Start polling if not already running
    if (!this.isMonitoring) {
      this.startPolling();
    }
  }

  /**
   * Stop monitoring a drive path
   */
  async removeDrive(path: string): Promise<void> {
    const state = this.drives.get(path);
    if (!state) return;

    this.drives.delete(path);
    await log(`DriveMonitor: Removed drive monitoring for ${state.volumeName}`);
  }

  /**
   * Get current state of a monitored drive
   */
  getState(path: string): DriveState | undefined {
    return this.drives.get(path);
  }

  /**
   * Get all monitored drives
   */
  getAllDrives(): DriveState[] {
    return Array.from(this.drives.values());
  }

  /**
   * Register callback for drive state changes
   */
  onChange(callback: DriveEventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      this.eventCallbacks = this.eventCallbacks.filter(c => c !== callback);
    };
  }

  /**
   * Force check all monitored drives
   */
  async checkAll(): Promise<void> {
    for (const [path] of this.drives) {
      await this.checkDrive(path);
    }
  }

  /**
   * Clean up all monitoring
   */
  async destroy(): Promise<void> {
    this.isMonitoring = false;

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    for (const [path] of this.drives) {
      await this.removeDrive(path);
    }

    this.eventCallbacks = [];
  }

  // Private methods

  /**
   * Check if a drive is still accessible
   */
  async checkDrive(path: string): Promise<void> {
    const state = this.drives.get(path);
    if (!state) return;

    const wasAccessible = state.isAccessible;
    const isAccessible = await isDriveAccessible(path);

    state.isAccessible = isAccessible;
    state.lastChecked = Date.now();

    await log(
      `DriveMonitor: Checked ${state.volumeName} - accessible: ${isAccessible}`
    );

    // Emit event if state changed
    if (wasAccessible && !isAccessible) {
      await this.emitEvent({
        type: "disconnected",
        path,
        volumeName: state.volumeName,
      });
    } else if (!wasAccessible && isAccessible) {
      await this.emitEvent({
        type: "connected",
        path,
        volumeName: state.volumeName,
      });
    } else {
      await this.emitEvent({
        type: "checked",
        path,
        accessible: isAccessible,
      });
    }
  }

  /**
   * Start polling interval (5 seconds)
   */
  private startPolling(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    this.pollingInterval = setInterval(async () => {
      try {
        await this.checkAll();
      } catch (error) {
        await log(`DriveMonitor polling error: ${error}`);
      }
    }, 5000);

    if (this.pollingInterval?.unref) {
      this.pollingInterval.unref();
    }
  }

  /**
   * Emit event to all listeners
   */
  private async emitEvent(event: DriveEvent): Promise<void> {
    for (const callback of this.eventCallbacks) {
      try {
        await callback(event);
      } catch (error) {
        await log(`DriveMonitor event callback error: ${error}`);
      }
    }
  }
}

// Global singleton instance
let instance: DriveMonitor | null = null;

/**
 * Get or create the DriveMonitor singleton
 */
export function getDriveMonitor(): DriveMonitor {
  if (!instance) {
    instance = new DriveMonitor();
  }
  return instance;
}

/**
 * Create reactive signals for monitoring a drive
 * Integrates with SolidJS reactivity system
 *
 * @param gamePath Path to game installation directory
 * @returns Object with isAccessible signal and cleanup function
 *
 * @example
 * const { isAccessible, cleanup } = useDriveMonitor("/Volumes/GameHDD/Games");
 * onCleanup(() => cleanup());
 *
 * return (
 *   <Show when={!isAccessible()} fallback={<GameLauncher />}>
 *     <DriveDisconnectedAlert volume={getVolumeName(gamePath)} />
 *   </Show>
 * );
 */
export function useDriveMonitor(gamePath: string) {
  const [isAccessible, setIsAccessible] = createSignal(true);
  const [lastError, setLastError] = createSignal<string | null>(null);
  const [volumeName, setVolumeName] = createSignal<string>("");

  const monitor = getDriveMonitor();

  // Initialize monitoring
  (async () => {
    try {
      await monitor.addDrive(gamePath);

      const state = monitor.getState(gamePath);
      if (state) {
        setIsAccessible(state.isAccessible);
        setVolumeName(state.volumeName);
      }
    } catch (error) {
      setLastError(String(error));
    }
  })();

  // Subscribe to changes
  const unsubscribe = monitor.onChange(async (event) => {
    if (event.type === "disconnected" && event.path === gamePath) {
      setIsAccessible(false);
      setLastError("External drive disconnected");
    } else if (event.type === "connected" && event.path === gamePath) {
      setIsAccessible(true);
      setLastError(null);
    } else if (event.type === "checked" && event.path === gamePath) {
      setIsAccessible(event.accessible);
      if (!event.accessible) {
        setLastError("Drive not accessible");
      } else {
        setLastError(null);
      }
    }
  });

  onCleanup(() => {
    unsubscribe();
  });

  return {
    isAccessible,
    lastError,
    volumeName,
    forceCheck: async () => await monitor.checkDrive(gamePath),
    cleanup: async () => await monitor.removeDrive(gamePath),
  };
}
