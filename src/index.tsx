import { render } from "solid-js/web";
import { createApp } from "./app";
import { HopeProvider } from "@hope-ui/solid";

import "./styles.css";
import { fatal } from "./utils";

if (typeof Neutralino == "undefined") {
  console.log(`This app doesn't work on browser.`);
} else {
  Neutralino.init();
  if (import.meta.env.PROD) {
    document.addEventListener("contextmenu", (event) => event.preventDefault());
  }
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
    .catch(fatal);
}
