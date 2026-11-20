import { fileOrDirExists, resolve } from "@utils";

// Built from native/DockIconBridge.m by build-app.js.
const BRIDGE_PATH = "./sidecar/dock-icon/DockIconBridge.dylib";

/**
 * Environment for a game launch that clips the game's Dock icon to the macOS
 * squircle shape. Empty when disabled or when the bridge was not built (dev runs).
 *
 * Wine runtimes whose own launcher script clears DYLD_INSERT_LIBRARIES simply
 * keep the original icon.
 */
export async function dockIconEnv(
  squircleDockIcon: boolean
): Promise<{ [key: string]: string }> {
  const bridge = resolve(BRIDGE_PATH);
  if (!squircleDockIcon || !(await fileOrDirExists(bridge))) return {};
  return { DYLD_INSERT_LIBRARIES: bridge };
}
