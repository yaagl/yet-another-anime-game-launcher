import { render } from "solid-js/web";
import { createApp } from "./app";
import { HopeProvider, NotificationsProvider } from "@hope-ui/solid";
import { slateDark, amber } from "@radix-ui/colors";

import { fatal, getKeyOrDefault } from "./utils";

function createPlates(
  tag: string,
  color: Record<string, string>,
  colortag: string
) {
  return Object.fromEntries(
    new Array(12)
      .fill(1)
      .map(
        (_, i) =>
          [`${tag}${i + 1}`, color[`${colortag}${i + 1}`] as string] as const
      )
  );
}

if (typeof Neutralino == "undefined") {
  console.log(`This app doesn't work on browser.`);
} else {
  Neutralino.init();
  if (import.meta.env.PROD) {
    document.addEventListener("contextmenu", event => event.preventDefault());
  }
  createApp()
    .then(async UI => {
      const savedColorMode = await getKeyOrDefault("color_mode", "light");
      localStorage.setItem("hope-ui-color-mode", savedColorMode);

      render(
        () => (
          <HopeProvider
            config={{
              initialColorMode: "light",
              lightTheme: {
                colors: {
                  ...createPlates("primary", amber, "amber"), // 兔兔伯爵，出击
                },
                fonts: {
                  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                },
              },
              darkTheme: {
                colors: {
                  ...createPlates("primary", slateDark, "slate"),
                },
                fonts: {
                  sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif",
                },
              },
            }}
          >
            <NotificationsProvider>
              <UI />
            </NotificationsProvider>
          </HopeProvider>
        ),
        document.getElementById("root") as HTMLElement
      );
      Neutralino.window.show();
    })
    .catch(fatal);
}
