import { Aria2 } from "./aria2";
import { Wine } from "./wine";
import { CN_SERVER, ServerContentData } from "./constants/server";
import { waitImageReady } from "./utils";
import {
  Box,
  Button,
  ButtonGroup,
  Center,
  Flex,
  HStack,
  IconButton,
  Progress,
  ProgressIndicator,
  Spacer,
  VStack,
} from "@hope-ui/solid";
import { createIcon } from "@hope-ui/solid";

const IconSetting = createIcon({
  viewBox: "0 0 1024 1024",
  path() {
    return (
      <path
        fill="currentColor"
        d="M396.72 320.592a141.184 141.184 0 0 1-99.824 15.92 277.648 277.648 0 0 0-45.344 74.576 141.216 141.216 0 0 1 37.52 95.952 141.248 141.248 0 0 1-41.728 100.32 274.4 274.4 0 0 0 49.952 86.224 141.264 141.264 0 0 1 107.168 14.176 141.216 141.216 0 0 1 63.984 79.296 274.72 274.72 0 0 0 86.816-1.92 141.248 141.248 0 0 1 66.016-86.304 141.216 141.216 0 0 1 101.856-15.488 277.648 277.648 0 0 0 41.92-76.544 141.184 141.184 0 0 1-36.128-94.4c0-34.912 12.768-67.68 34.816-92.96a274.736 274.736 0 0 0-38.192-70.032 141.264 141.264 0 0 1-105.792-14.56 141.312 141.312 0 0 1-67.168-90.912 274.4 274.4 0 0 0-92.784 0.016 141.152 141.152 0 0 1-63.088 76.64z m22.56-116.656c57.312-16 119.024-16.224 178.016 1.216a93.44 93.44 0 0 0 142.288 86.736 322.64 322.64 0 0 1 79.104 142.656 93.328 93.328 0 0 0-41.76 77.84 93.36 93.36 0 0 0 42.88 78.592 322.832 322.832 0 0 1-34.208 85.232 323.392 323.392 0 0 1-47.968 63.568 93.392 93.392 0 0 0-92.352 0.64 93.408 93.408 0 0 0-46.688 83.616 322.704 322.704 0 0 1-171.424 3.84 93.376 93.376 0 0 0-46.704-78.544 93.408 93.408 0 0 0-95.184 1.008A322.432 322.432 0 0 1 192 589.28a93.408 93.408 0 0 0 49.072-82.24c0-34.128-18.304-64-45.632-80.288a323.392 323.392 0 0 1 31.088-73.328 322.832 322.832 0 0 1 56.704-72.256 93.36 93.36 0 0 0 89.488-2.144 93.328 93.328 0 0 0 46.56-75.088z m92.208 385.28a68.864 68.864 0 1 0 0-137.76 68.864 68.864 0 0 0 0 137.76z m0 48a116.864 116.864 0 1 1 0-233.76 116.864 116.864 0 0 1 0 233.76z"
        p-id="2766"
      ></path>
    );
  },
});

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
        <Flex h="100vh" direction={"column-reverse"}>
          <Flex mr={"10vw"} ml={"10vw"} mb={50} columnGap="10vw" alignItems={"flex-end"}>
            <Box flex={1}>
              <h3 style={"text-shadow: 1px 1px 2px #333;color:white;margin-bottom:5px;"}>Status</h3>
              <Progress value={50} size="sm" borderRadius={8}>
                <ProgressIndicator borderRadius={8}></ProgressIndicator>
              </Progress>
            </Box>
            <Box>
              <ButtonGroup size="xl" attached>
                <Button mr="-1px">Launch</Button>
                <IconButton fontSize={30} aria-label="Settings" icon={<IconSetting />} />
              </ButtonGroup>
            </Box>
          </Flex>
        </Flex>
      </div>
    );
  };
}
