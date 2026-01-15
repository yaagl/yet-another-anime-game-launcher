import { join } from "path-browserify";
import { CommonUpdateProgram } from "@common-update-ui";
import { Server } from "@constants";
import {
  mkdirp,
  removeFile,
  writeBinary,
  writeFile,
  readBinary,
  resolve,
  utf16le,
  log,
  exec,
} from "@utils";
import { Wine } from "@wine";
import { Config } from "@config";
import { putLocal, patchProgram, patchRevertProgram } from "../patch";
import { HKRPG_CN_BLOCK_URL, HKRPG_OS_BLOCK_URL } from "../../secret";

export async function* launchGameProgram({
  gameDir,
  gameExecutable,
  wine,
  config,
  server,
}: {
  gameDir: string;
  gameExecutable: string;
  wine: Wine;
  config: Config;
  server: Server;
}): CommonUpdateProgram {
  yield ["setUndeterminedProgress"];
  yield ["setStateText", "PATCHING"];

  await fixWebview(wine, server);
  await wine.setProps(config);
  if (wine.attributes.renderBackend == "dxmt") await wine.setNVExtension();

  const cmd = `@echo off
cd "%~dp0"
cd /d "${wine.toWinePath(gameDir)}"
"${wine.toWinePath(resolve("./jadeite/jadeite.exe"))}" "${wine.toWinePath(
    join(gameDir, gameExecutable)
  )}" -- -disable-gpu-skinning`;
  await writeFile(resolve("config.bat"), cmd);
  yield* patchProgram(gameDir, wine, server, config);
  await mkdirp(resolve("./logs"));
  const yaaglDir = resolve("./");
  try {
    yield ["setStateText", "GAME_RUNNING"];
    const logfile = resolve(`./logs/game_${Date.now()}.log`);

    if (config.blockNet) {
      const tmpScriptPath = "/tmp/yaagl_network_block_script.sh";
      const blockUrl =
        server.id == "hkrpg_global" ? HKRPG_OS_BLOCK_URL : HKRPG_CN_BLOCK_URL;

      const commands = [
        `#!/bin/sh`,

        `HOSTS_FILE="/etc/hosts"`,
        `ENTRY="0.0.0.0 ${blockUrl}"`,
        `PAD_START="# Temporarily Added by Yaagl"`,
        `PAD_END="# End of section"`,

        `if ! grep -qF "$ENTRY" "$HOSTS_FILE"; then`,
        `sudo bash -c "echo -e '$PAD_START\n$ENTRY\n$PAD_END' >> '/etc/hosts'"`,
        `fi`,
        `sleep 15`,
        `sudo sed -i.bak "/$PAD_START/,/$PAD_END/d" "$HOSTS_FILE"`,

        `rm ${tmpScriptPath}`,
      ];

      await writeFile(tmpScriptPath, commands.join("\n"));
      await exec(
        [
          "osascript",
          "-e",
          `do shell script "source ${tmpScriptPath} > /dev/null 2>&1 &" with administrator privileges`,
        ],
        {},
        false
      );
    }

    await wine.exec2(
      "cmd",
      ["/c", `${wine.toWinePath(resolve("./config.bat"))}`],
      {
        MTL_HUD_ENABLED: config.metalHud ? "1" : "",
        WINEDLLOVERRIDES: "d3d11,dxgi=n,b",
        ...(wine.attributes.renderBackend == "dxmt"
          ? {
              WINEMSYNC: "1",
              DXMT_LOG_PATH: yaaglDir,
              DXMT_CONFIG:
                "d3d11.preferredMaxFrameRate=60;dxgi.customVendorId=10de;dxgi.customDeviceId=2684",
              DXMT_CONFIG_FILE: join(yaaglDir, "dxmt.conf"),
              DXMT_ENABLE_NVEXT: "1",
              GST_PLUGIN_FEATURE_RANK: "atdec:MAX,avdec_h264:MAX",
            }
          : {
              WINEESYNC: "1",
            }),
        ...(config.proxyEnabled
          ? {
              HTTP_PROXY: config.proxyHost,
              HTTPS_PROXY: config.proxyHost,
            }
          : {}),
      },
      logfile
    );
    await wine.waitUntilServerOff();
  } catch (e: unknown) {
    // it seems game crashed?
    await log(String(e));
  }

  await removeFile(resolve("config.bat"));
  yield ["setStateText", "REVERT_PATCHING"];
  yield* patchRevertProgram(gameDir, wine, server, config);
}

async function fixWebview(wine: Wine, server: Server) {
  let key = "HKEY_CURRENT_USER\\Software\\";
  if (server.id === "hkrpg_cn") {
    key +=
      "\x6d\x69\x48\x6f\x59\x6f\\\u5d29\u574f\uff1a\u661f\u7a79\u94c1\u9053";
  } else if (server.id === "hkrpg_global") {
    key +=
      "\x43\x6f\x67\x6e\x6f\x73\x70\x68\x65\x72\x65\\\x53\x74\x61\x72\x20\x52\x61\x69\x6c";
  } else {
    return;
  }

  const reg = [
    `Windows Registry Editor Version 5.00`,
    ``,
    `[${key}]`,
    `"MIHOYOSDK_WEBVIEW_RENDER_METHOD_h1573598267"=-`,
  ];

  try {
    await wine.exec("reg", ["query", key], {}, resolve("fix_webview.log"));

    // the output contains malformed CJK characters
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const output = decoder.decode(await readBinary(resolve("fix_webview.log")));

    for (let line of output.split("\n")) {
      line = line.trim();
      if (line.startsWith("HOYO_WEBVIEW_RENDER_METHOD_ABTEST_")) {
        const abtest = line.split(" ", 2)[0];
        reg.push(`"${abtest}"=-`);
      }
    }
  } catch (e: unknown) {
    return;
  }

  await writeBinary(resolve("fix_webview.reg"), utf16le(reg.join("\r\n")));
  await wine.exec(
    "reg",
    ["import", `${wine.toWinePath(resolve("./fix_webview.reg"))}`],
    {},
    "/dev/null"
  );
}
