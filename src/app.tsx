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
  open,
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
import type { Component } from "solid-js";
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

  let MainApp: Component;

  let showPromptSignal: (v: boolean) => void;
  let setPendingUpdateInfoSignal: (v: any) => void;

  const onCheckUpdate = async () => {
    const result = await createUpdater({ github, aria2 });
    if (result.latest === undefined) {
      await Neutralino.os.showMessageBox(
        "Error",
        "Failed to check for updates. Please reopen the launcher and try again.",
        "OK"
      );
      return;
    }
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
      wineUpdate: wineStatus.wineUpdate,
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
              <ModalHeader>{locale.get("NEW_VERSION_AVAILABLE")}</ModalHeader>
              <ModalBody>
                <Text mb={"$2"} style={{ "white-space": "pre-wrap" }}>
                  {locale
                    .format("NEW_VERSION_AVAILABLE_DESC", [
                      pendingUpdateInfo().version ?? "",
                      "",
                    ])
                    .trim()}
                </Text>
                {renderMarkdown(pendingUpdateInfo().description ?? "")}
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

function renderInline(text: string): JSXElement[] {
  const nodes: JSXElement[] = [];
  const tokenRe =
    /`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|\*([^*]+)\*|_([^_]+)_/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push(text.slice(lastIndex, m.index));
    }
    if (m[1] !== undefined) {
      nodes.push(<code>{m[1]}</code>);
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const url = m[3];
      nodes.push(
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            open(url);
          }}
        >
          {m[2]}
        </a>
      );
    } else if (m[4] !== undefined || m[5] !== undefined) {
      nodes.push(<strong>{m[4] ?? m[5]}</strong>);
    } else if (m[6] !== undefined) {
      nodes.push(<del>{m[6]}</del>);
    } else if (m[7] !== undefined || m[8] !== undefined) {
      nodes.push(<em>{m[7] ?? m[8]}</em>);
    }
    lastIndex = tokenRe.lastIndex;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}

function renderMarkdown(md: string): JSXElement {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: JSXElement[] = [];
  let listItems: JSXElement[] = [];
  let listOrdered = false;
  let codeLines: string[] | null = null;

  const flushList = () => {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    blocks.push(listOrdered ? <ol>{items}</ol> : <ul>{items}</ul>);
  };

  for (const rawLine of lines) {
    if (rawLine.trimStart().startsWith("```")) {
      flushList();
      if (codeLines === null) {
        codeLines = [];
      } else {
        const code = codeLines.join("\n");
        codeLines = null;
        blocks.push(
          <pre>
            <code>{code}</code>
          </pre>
        );
      }
      continue;
    }
    if (codeLines !== null) {
      codeLines.push(rawLine);
      continue;
    }
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    const ulMatch = rawLine.match(/^\s*[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (listItems.length && listOrdered) flushList();
      listOrdered = false;
      listItems.push(<li>{renderInline(ulMatch[1])}</li>);
      continue;
    }
    const olMatch = rawLine.match(/^\s*\d+\.\s+(.*)$/);
    if (olMatch) {
      if (listItems.length && !listOrdered) flushList();
      listOrdered = true;
      listItems.push(<li>{renderInline(olMatch[1])}</li>);
      continue;
    }
    flushList();
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (/^(?:---+|\*\*\*+|___+)$/.test(line)) {
      blocks.push(<hr />);
    } else if (headingMatch) {
      const level = headingMatch[1].length;
      const content = renderInline(headingMatch[2]);
      blocks.push(
        level === 1 ? (
          <h2>{content}</h2>
        ) : level === 2 ? (
          <h3>{content}</h3>
        ) : (
          <h4>{content}</h4>
        )
      );
    } else if (line.startsWith("> ")) {
      blocks.push(<blockquote>{renderInline(line.slice(2))}</blockquote>);
    } else {
      blocks.push(<p>{renderInline(rawLine)}</p>);
    }
  }
  flushList();
  if (codeLines !== null) {
    blocks.push(
      <pre>
        <code>{codeLines.join("\n")}</code>
      </pre>
    );
  }
  return <div class="update-markdown">{blocks}</div>;
}
