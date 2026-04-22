import {
  exec,
  log,
  spawn,
  timeout,
  resolve,
  appendFile,
  addTerminationHook,
  GLOBAL_onClose,
  setKey,
  getKeyOrDefault,
  exit,
  rawString,
} from "./utils";
import { createAria2Retry } from "./aria2";
import {
  checkWine,
  createWine,
  createWineInstallProgram,
  getCorrectWineBinary,
} from "./wine";
import { createGithubEndpoint } from "./github";
import { createLauncher } from "./launcher";
import "./app.css";
import { createUpdater, downloadProgram } from "./updater";
import { createCommonUpdateUI } from "./common-update-ui";
import { createLocale } from "./locale";
import { createClient } from "./clients";
import { createSignal, Show, JSXElement } from "solid-js";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
} from "@hope-ui/solid";

export async function createApp() {
  await setKey("singleton", null);

  const aria2_port = 6868;

  await Neutralino.events.on("windowClose", async () => {
    if (await GLOBAL_onClose(false)) {
      exit(0);
    }
  });

  const locale = await createLocale();
  const github = await createGithubEndpoint();
  const aria2_session = resolve("./aria2.session");
  await appendFile(aria2_session, "");
  const pid = (await exec(["echo", rawString("$PPID")])).stdOut.split("\n")[0];
  const { pid: apid } = await spawn([
    "./sidecar/aria2/aria2c",
    "-d",
    "/",
    "--no-conf",
    "--enable-rpc",
    `--rpc-listen-port=${aria2_port}`,
    `--rpc-listen-all=true`,
    `--rpc-allow-origin-all`,
    `--input-file`,
    `${aria2_session}`,
    `--save-session`,
    `${aria2_session}`,
    `--pause`,
    `true`,
    "--stop-with-process",
    pid,
  ]);
  addTerminationHook(async () => {
    // double insurance (esp. for self restart)
    await log("killing process " + apid);
    try {
      await exec(["kill", apid + ""]);
    } catch {
      await log("killing process failed?");
    }
    return true;
  });
  const aria2 = await Promise.race([
    createAria2Retry({ host: "127.0.0.1", port: aria2_port }),
    timeout(15000),
  ]).catch(() =>
    Promise.reject(
      new Error(
        "Failed to start download service. Please restart the application."
      )
    )
  );
  await log(`Launched aria2 version ${aria2.version.version}`);
  const initialUpdateCheck = await createUpdater({
    github,
    aria2,
  });

  const ignoredVersion = await getKeyOrDefault("ignore_launcher_update", "");

  const wineStatus = await checkWine(github);
  const prefixPath = resolve("./wineprefix"); // CHECK: hardcoded path?

  let MainApp: () => JSXElement;

  let showPromptSignal: (v: boolean) => void;
  let setPendingUpdateInfoSignal: (v: any) => void;

  const onCheckUpdate = async () => {
    const result = await createUpdater({ github, aria2 });
    if (result.latest) {
      await locale.alert("SETTING_YAAGL_VERSION", "ALREADY_LATEST_VERSION");
    } else {
      if (setPendingUpdateInfoSignal && showPromptSignal) {
        setPendingUpdateInfoSignal(result);
        showPromptSignal(true);
      }
    }
  };

  if (wineStatus.wineReady) {
    const wine = await createWine({
      prefix: prefixPath,
      distro: wineStatus.wineDistribution,
    });
    MainApp = await createLauncher({
      wine,
      locale,
      github,
      channelClient: await createClient({
        wine,
        aria2,
        locale,
      }),
      onCheckUpdate,
    });
  } else {
    MainApp = await createWineInstallProgram({
      aria2,
      wineAbsPrefix: prefixPath,
      wineDistro: wineStatus.wineDistribution,
      locale,
    });
  }

  return function AppRoot() {
    const [updaterComponent, setUpdaterComponent] =
      createSignal<() => JSXElement>();
    const [pendingUpdateInfo, setPendingUpdateInfo] =
      createSignal(initialUpdateCheck);
    const [showPrompt, setShowPrompt] = createSignal(
      initialUpdateCheck.latest == false &&
        ignoredVersion !== initialUpdateCheck.version
    );

    showPromptSignal = setShowPrompt;
    setPendingUpdateInfoSignal = setPendingUpdateInfo;

    return (
      <>
        <Show when={updaterComponent()}>{updaterComponent()!()}</Show>
        <Show when={!updaterComponent()}>
          <MainApp />
          <Modal opened={showPrompt()} onClose={() => setShowPrompt(false)}>
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>{locale.get("NEW_VERSION_AVALIABLE")}</ModalHeader>
              <ModalBody>
                <Text mb={"$4"} style={{ "white-space": "pre-wrap" }}>
                  {locale.format("NEW_VERSION_AVALIABLE_DESC", [
                    pendingUpdateInfo().version!,
                    pendingUpdateInfo().description!,
                  ])}
                </Text>
              </ModalBody>
              <ModalFooter>
                <Button
                  variant="ghost"
                  colorScheme="danger"
                  mr="$3"
                  onClick={async () => {
                    await setKey(
                      "ignore_launcher_update",
                      pendingUpdateInfo().version!
                    );
                    setShowPrompt(false);
                  }}
                >
                  {locale.get("UPDATE_PROMPT_IGNORE")}
                </Button>
                <Button
                  variant="ghost"
                  mr="$3"
                  onClick={() => setShowPrompt(false)}
                >
                  {locale.get("SETTING_CANCEL")}
                </Button>
                <Button
                  onClick={() => {
                    const info = pendingUpdateInfo();
                    setUpdaterComponent(() =>
                      createCommonUpdateUI(locale, () =>
                        downloadProgram(
                          aria2,
                          info.downloadUrl!,
                          info.sidecarDownloadUrl
                        )
                      )
                    );
                    setShowPrompt(false);
                  }}
                >
                  {locale.get("UPDATE_LAUNCHER")}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </Show>
      </>
    );
  };
}
