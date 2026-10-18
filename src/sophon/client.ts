import { SophonRpcClient } from "@sophon-rpc";
import { addTerminationHook, log, resolve } from "@utils";

let client: Promise<SophonRpcClient> | undefined;
let clientDebugLogging = false;

addTerminationHook(async () => {
  await (await client)?.close();
  return true;
});

export async function getSophonClient(
  debugLogging = false
): Promise<SophonRpcClient> {
  if (client) {
    try {
      const connected = await client;
      if (clientDebugLogging === debugLogging) {
        await connected.call("rpc.discover", {}, { timeoutMs: 5000 });
        return connected;
      }
      await connected.close();
    } catch {
      await client.then(value => value.close()).catch(() => undefined);
    }
    client = undefined;
  }
  clientDebugLogging = debugLogging;
  client = SophonRpcClient.stdio(
    resolve("./sidecar/sophon/SophonCLI"),
    [
      "--progress-snapshots-only",
      "--manifest-cache-dir",
      resolve("./sophon/manifests"),
      "--log-file",
      resolve("./sophon.log"),
      "--log-level",
      debugLogging ? "debug" : "info",
    ],
    {
      onStderr: text => log(text),
      onNotificationError: error => log(String(error)),
    }
  );
  try {
    const connected = await client;
    await connected.call("rpc.discover", {}, { timeoutMs: 5000 });
    return connected;
  } catch (error) {
    await client.then(value => value.close()).catch(() => undefined);
    client = undefined;
    throw error;
  }
}
