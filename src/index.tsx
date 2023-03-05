import { render } from "solid-js/web";
import { createApp } from "./app";
import { HopeProvider } from "@hope-ui/solid";

import "./styles.css";

if (typeof Neutralino == "undefined") {
  console.log(`This app doesn't work on browser.`);
} else {
  Neutralino.init();
  createApp()
    .then((UI) => {
      render(
        () => (
          <HopeProvider>
            <UI />
          </HopeProvider>
        ),
        document.getElementById("root") as HTMLElement
      );
      Neutralino.window.show();
    })
    .catch(async (e) => {
      await Neutralino.os.showMessageBox(
        "Fatal error",
        `Launcher failed to open\n${e}\n${e.stack}`,
        "OK"
      );
      Neutralino.app.exit(-1);
    });
}
