import { Aria2 } from "./aria2";
import { Wine } from "./wine";
import { CN_SERVER, ServerContentData } from "./constants/server";
import { waitImageReady } from "./utils";

export async function createLauncher({
  aria2,
  wine,
}: {
  aria2: Aria2;
  wine: Wine;
}) {
  const server = CN_SERVER;
  const b: ServerContentData = await (await fetch(server.bg_url)).json();
  await waitImageReady(b.data.adv.background);

  return function Laucnher() {
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
}
