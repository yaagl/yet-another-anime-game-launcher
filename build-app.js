const execa = require("execa");
const fs = require("fs-extra");
const path = require("path");
const { rimraf } = require("rimraf");
const { IconIcns } = require("@shockpkg/icon-encoder");

(async () => {
  const icns = new IconIcns();
  const raw = true;

  await execa("cp", ["neutralino.config.json", "neutralino.config.json.bak"]);
  // build done read neutralino.config.js file
  const config = await fs.readJSON(
    path.resolve(process.cwd(), "neutralino.config.json")
  );
  let bundleId;
  let appDistributionName;
  switch (process.env["YAAGL_CHANNEL_CLIENT"]) {
    case "hk4ecn":
      bundleId = config.applicationId;
      appDistributionName = config.cli.binaryName;
      break;
    case "hk4eos":
      bundleId = config.applicationId + ".os";
      appDistributionName = config.cli.binaryName + " OS";
      break;
    case "hk4euniversal":
      bundleId = config.applicationId + ".uni";
      appDistributionName = config.cli.binaryName + " Uni";
      break;
    case "hkrpgcn":
      bundleId = config.applicationId + ".hkrpg.cn";
      appDistributionName = config.cli.binaryName + " HSR";
      config.modes.window.icon = "/src/icons/March7th.cr.png";
      break;
    case "hkrpgos":
      bundleId = config.applicationId + ".hkrpg.os";
      appDistributionName = config.cli.binaryName + " HSR OS";
      config.modes.window.icon = "/src/icons/March7th.cr.png";
      break;
    case "bh3glb":
      bundleId = config.applicationId + ".bh3.glb";
      appDistributionName = config.cli.binaryName + " Honkai Global";
      config.modes.window.icon = "/src/icons/Elysia.cr.png";
      break;
    case "cbjq":
      bundleId = config.applicationId + ".scz.os";
      appDistributionName = config.cli.binaryName + " SCZ OS";
      break;
    case "cbjqcn":
      bundleId = config.applicationId + ".scz.cn";
      appDistributionName = config.cli.binaryName + " SCZ";
      break;
    case "napos":
      bundleId = config.applicationId + ".nap.os";
      appDistributionName = config.cli.binaryName + " ZZZ OS";
      config.modes.window.icon = "/src/icons/ZZZ_Bang.cr.png";
      break;
    case "napcn":
      bundleId = config.applicationId + ".nap.cn";
      appDistributionName = config.cli.binaryName + " ZZZ";
      config.modes.window.icon = "/src/icons/ZZZ_Bang.cr.png";
      break;
    default:
      throw new Error("YAAGL_CHANNEL_CLIENT env required");
  }
  if (process.env["YAAGL_TEST"]) {
    bundleId += ".test";
    appDistributionName += " Test";
  }
  await fs.writeJSON(
    path.resolve(process.cwd(), "neutralino.config.json"),
    config
  );
  try {
    await execa("pnpm", ["exec", "tsc"]); // do typecheck first
    await execa("rm", ["-rf", "./.tmp"]);
    await execa("pnpm", ["exec", "vite", "build"]);
    await execa("cp", ["./neutralino.js", "./dist/neutralino.js"]);
    // run neu build command
    await execa("pnpm", ["exec", "neu", "build"]);
  } finally {
    await execa("mv", [
      "-f",
      "neutralino.config.json.bak",
      "neutralino.config.json",
    ]);
  }

  const appname = config.cli.binaryName;
  const binaryName = `${config.cli.binaryName}-mac_x64`;

  // read package.json
  const pkg = await fs.readJSON(path.resolve(process.cwd(), "package.json"));
  // remove old app folder
  await rimraf(path.resolve(process.cwd(), `${appDistributionName}.app`));
  // create app folder
  await fs.mkdir(path.resolve(process.cwd(), `${appDistributionName}.app`));
  await fs.mkdir(
    path.resolve(process.cwd(), `${appDistributionName}.app`, "Contents")
  );
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS"
    )
  );
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "Resources"
    )
  );
  await fs.mkdir(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "Resources",
      ".storage"
    )
  );
  // move binary to app folder
  await fs.move(
    path.resolve(process.cwd(), "dist", appname, binaryName),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      binaryName
    )
  );
  await fs.rename(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      binaryName
    ),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      appname
    )
  );

  // move res.neu or resources.neu to app folder
  const resources = fs.readdirSync(
    path.resolve(process.cwd(), "dist", appname)
  );
  const resourcesFile = resources.find(file => /res(ources)?/.test(file));
  await fs.copy(
    path.resolve(process.cwd(), "dist", appname, resourcesFile),
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "Resources",
      resourcesFile
    )
  );

  // check if file exists
  if (fs.existsSync(path.join(process.cwd(), config.modes.window.icon))) {
    const iconFile = await fs.readFile(
      path.join(process.cwd(), config.modes.window.icon)
    );
    icns.addFromPng(iconFile, ["ic09"], raw);
    // icns.addFromPng(iconFile, ['ic07'], raw);
    // icns.addFromPng(iconFile, ['ic08'], raw);
    // icns.addFromPng(iconFile, ['ic04'], raw);
    // icns.addFromPng(iconFile, ['ic09'], raw);
    // icns.addFromPng(iconFile, ['ic05'], raw);
    // icns.addFromPng(iconFile, ['ic12'], raw);
    // icns.addFromPng(iconFile, ['ic13'], raw);
    // icns.addFromPng(iconFile, ['ic14'], raw);
    // icns.addFromPng(iconFile, ['ic10'], raw);
    // icns.addFromPng(iconFile, ['ic11'], raw);
  }
  // save icns file
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "Resources",
      "icon.icns"
    ),
    icns.encode()
  );

  // create an empty icon file in the app folder
  // await fs.ensureFile(
  //   path.resolve(process.cwd(), `${appDistributionName}.app`, "Icon")
  // );

  //
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      "parameterized"
    ),
    `#!/usr/bin/env bash
SCRIPT_DIR="$( cd -- "$( dirname -- "\${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
APST_DIR="$HOME/Library/Application Support/${appDistributionName}"
echo $APST_DIR
mkdir -p "$APST_DIR"
CONTENTS_DIR="$(dirname "$SCRIPT_DIR")"
rsync -rlptu "$CONTENTS_DIR/Resources/." "$APST_DIR"
cd "$APST_DIR"
PATH_LAUNCH="$(dirname "$CONTENTS_DIR")" exec "$SCRIPT_DIR/${appname}" --path="$APST_DIR"`
  );

  await fs.chmod(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      "parameterized"
    ),
    0o755
  );
  await fs.chmod(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "MacOS",
      appname
    ),
    0o755
  );
  // copy sidecar
  const sidecarDst = path.resolve(
    process.cwd(),
    `${appDistributionName}.app`,
    `Contents`,
    `Resources`,
    `sidecar`
  );
  await fs.copy(path.resolve(process.cwd(), `sidecar`), sidecarDst, {
    preserveTimestamps: true,
  });

  await (async function getFiles(dir) {
    const dirents = await fs.readdir(dir, { withFileTypes: true });
    await Promise.all(
      dirents.map(dirent => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory()
          ? getFiles(res)
          : dirent.isFile()
          ? dirent.name.split(".").length == 1
            ? fs.chmod(res, 0o755).then(() => {
                console.log("chmod +x " + res);
              })
            : Promise.resolve()
          : Promise.resolve();
      })
    );
  })(sidecarDst);

  // chmod executable
  // create info.plist file
  await fs.writeFile(
    path.resolve(
      process.cwd(),
      `${appDistributionName}.app`,
      "Contents",
      "Info.plist"
    ),
    `<?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE plist PUBLIC "-//Apple Computer//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
    <plist version="1.0">
    <dict>
        <key>NSHighResolutionCapable</key>
        <true/>
        <key>CFBundleExecutable</key>
        <string>parameterized</string>
        <key>CFBundleIconFile</key>
        <string>icon.icns</string>
        <key>CFBundleIdentifier</key>
        <string>${bundleId}</string>
        <key>CFBundleName</key>
        <string>${config.modes.window.title}</string>
        <key>CFBundleDisplayName</key>
        <string>${config.modes.window.title}</string>
        <key>CFBundlePackageType</key>
        <string>APPL</string>
        <key>CFBundleVersion</key>
        <string>${config.version}</string>
        <key>CFBundleShortVersionString</key>
        <string>${config.version}</string>
        <key>NSHumanReadableCopyright</key>
        <string>Copyright © 2023 3Shain.</string>
        <key>LSMinimumSystemVersion</key>
        <string>10.13.0</string>
        <key>NSAppTransportSecurity</key>
        <dict>
            <key>NSAllowsArbitraryLoads</key>
            <true/>
        </dict>
    </dict>
    </plist>`
  );
})();
