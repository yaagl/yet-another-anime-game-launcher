import { CN_SERVER, ServerContentData } from "./constants/server";
import { exec, log, spawn, timeout, wait, waitImageReady } from "./utils";
import "./app.css";
import { createAria2 } from "./aria2";
import { checkWine, createWineInstallProgram } from "./wine";
import { createGithubEndpoint } from "./github";

export async function createApp() {
  const server = CN_SERVER;

  let aria2_port = 6868;

  // const b: ServerContentData = await (await fetch(server.bg_url)).json();
  // await waitImageReady(b.data.adv.background);

  await Neutralino.events.on("ready", async () => {});
  await Neutralino.events.on("windowClose", async () => {
    for (const process of await Neutralino.os.getSpawnedProcesses()) {
      await Neutralino.os.execCommand("kill " + process.pid);
    }
    Neutralino.app.exit(0);
  });

  // const g = await exec('xattr -r -d com.apple.quarantine "$HOME/Library/Application Support/Yaagl"', []);
  // await log(g.stdOut);
  // await log(g.stdErr);

  try {
    // const github = await createGithubEndpoint();
    // await spawn("./sidecar/aria2/aria2c", [
    //   "--enable-rpc",
    //   `--rpc-listen-port=${aria2_port}`,
    //   `--rpc-listen-all=true`,
    //   `--rpc-allow-origin-all`,
    // ]);
    // const aria2 = await Promise.race([
    //   createAria2({ host: "127.0.0.1", port: aria2_port }),
    //   timeout(10000),
    // ]);
    // await log(`Launched aria2 version ${aria2.version.version}`);

    return ()=><div>TODO</div>

    const { wineReady, wineUpdate } = await checkWine();

    if (wineReady) {
      return function App() {
        // const bh = 40 / window.devicePixelRatio;
        // const bw = 136 / window.devicePixelRatio;
        const bh = 40;
        const bw = 136;

        return (
          <div
            class="background"
            style={{
              "background-image": `url(${b.data.adv.background})`,
            }}
          >
            <div
              role="button"
              class="version-icon"
              style={{
                "background-image": `url(${b.data.adv.icon})`,
                height: `${bh}px`,
                width: `${bw}px`, //fixme: responsive size
              }}
            ></div>
            <div role="button" class="launch-button">
              启动游戏
            </div>
          </div>
        );
      };
    } else {
      return await createWineInstallProgram({
        aria2,
        wineUpdate:wineUpdate!
      })
    }
  } catch (e) {
    if (e === "TIMEOUT") {
      throw new Error("Aria2 failed to launch");
    }
    throw e;
  }
}
