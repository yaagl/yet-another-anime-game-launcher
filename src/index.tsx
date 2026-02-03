import { render } from "solid-js/web";
import { createApp } from "./app";
import "./app.css";
import { Toast } from "./components/ui";

import { fatal, log, initializeBasePath } from "./utils";
import { logError } from "./utils/structured-logging";

if (typeof Neutralino == "undefined") {
  console.log(`This app doesn't work on browser.`);
} else {
  Neutralino.init();
  if (import.meta.env.PROD) {
    document.addEventListener("contextmenu", event => event.preventDefault());
  }
  
  // Wait for path initialization BEFORE creating app
  initializeBasePath()
    .catch(err => {
      console.warn("Path init warning, continuing with fallback:", err);
    })
    .then(() => {
      createApp()
        .then(UI => {
          render(() => (
            <>
              <UI />
              <Toast.Region>
                <Toast.List class="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-96" />
              </Toast.Region>
            </>
          ), document.getElementById("root") as HTMLElement);
          Neutralino.window.show();
        })
        .catch(async error => {
          // Use structured logging for fatal errors
          await logError("Fatal application error during initialization", error, {
            timestamp: new Date().toISOString(),
            environment: import.meta.env.MODE,
          });
          await fatal(error);
        });
    });
}
