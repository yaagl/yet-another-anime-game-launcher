import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'path';
import { rimraf } from 'rimraf';
import { IconIcns } from '@shockpkg/icon-encoder';

/**
 * Ensures Sophon server is built and up-to-date
 * Rebuilds if models.py is newer than the compiled binary
 */
async function ensureSophonBuild() {
  const sophonDistPath = path.resolve(process.cwd(), 'sophon_server', 'dist', 'sophon-server');
  const sophonModelsPath = path.resolve(process.cwd(), 'sophon_server', 'models.py');
  const sophonBuildScript = path.resolve(process.cwd(), 'sophon_server', 'build-sophon.sh');

  // Check if build script exists
  if (!fs.existsSync(sophonBuildScript)) {
    throw new Error('Sophon build script not found: ' + sophonBuildScript);
  }

  // Check if rebuild is needed
  let needsRebuild = !fs.existsSync(sophonDistPath);
  
  if (!needsRebuild && fs.existsSync(sophonModelsPath)) {
    const binaryStat = fs.statSync(sophonDistPath);
    const modelsStat = fs.statSync(sophonModelsPath);
    needsRebuild = modelsStat.mtime > binaryStat.mtime;
  }

  if (needsRebuild) {
    console.log('\n📦 Building Sophon server...');
    try {
      await execa('bash', [sophonBuildScript], { cwd: path.resolve(process.cwd(), 'sophon_server'), stdio: 'inherit' });
      console.log('✅ Sophon server built successfully\n');
    } catch (error) {
      throw new Error(`Failed to build Sophon server:\n${error.message}`);
    }
  }

  // Verify binary exists after build
  if (!fs.existsSync(sophonDistPath)) {
    throw new Error('Sophon binary not found after build attempt: ' + sophonDistPath);
  }

  console.log('✅ Sophon server ready');
}

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
  let includeSophon = false;
  switch (process.env["YAAGL_CHANNEL_CLIENT"]) {
    case "hk4ecn":
      bundleId = config.applicationId;
      appDistributionName = config.cli.binaryName;
      includeSophon = true;
      break;
    case "hk4eos":
      bundleId = config.applicationId + ".os";
      appDistributionName = config.cli.binaryName + " OS";
      includeSophon = true;
      break;
    case "hk4euniversal":
      bundleId = config.applicationId + ".uni";
      appDistributionName = config.cli.binaryName + " Uni";
      includeSophon = true;
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
    await rimraf("./.tmp");
    await execa("pnpm", ["exec", "vite", "build"]);
    await execa("cp", ["./neutralino.js", "./dist/neutralino.js"]);
    // run neu build command
    await execa("pnpm", ["exec", "neu", "build"]);
    
    // Ensure Sophon is built if needed for this channel
    if (includeSophon) {
      await ensureSophonBuild();
    }
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
  // copy sophon binary to sidecar
  if (includeSophon) {
    await fs.ensureDir(path.resolve(sidecarDst, `sophon_server`));
    const sophonSrc = path.resolve(process.cwd(), `sophon_server`, `dist`, `sophon-server`);
    const sophonDst = path.resolve(sidecarDst, `sophon_server`, `sophon-server`);
    
    if (!fs.existsSync(sophonSrc)) {
      throw new Error(`Sophon binary not found at: ${sophonSrc}\nMake sure build-sophon.sh completed successfully`);
    }
    
    await fs.copy(sophonSrc, sophonDst, {
      preserveTimestamps: true,
    });
    console.log(`✅ Copied Sophon server to: ${sophonDst}`);
  }
  // Remove potentially existing dev sophon_server from sidecar
  await fs.remove(path.resolve(process.cwd(), `sidecar`, `sophon_server`));
  await fs.copy(path.resolve(process.cwd(), `sidecar`), sidecarDst, {
    preserveTimestamps: true,
  });
  // Remove protonextras for hkrpg and nap
  if (["hkrpgcn", "hkrpgos", "napcn", "napos"].includes(process.env["YAAGL_CHANNEL_CLIENT"])) {
    await fs.remove(path.resolve(sidecarDst, "protonextras"));
  }

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
        <string>10.15.0</string>
        <key>NSAppTransportSecurity</key>
        <dict>
            <key>NSAllowsArbitraryLoads</key>
            <true/>
        </dict>
    </dict>
    </plist>`
  );
  
  // Calculate total app size recursively
  async function getDirectorySize(dirPath) {
    let totalSize = 0;
    const dirents = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const dirent of dirents) {
      const fullPath = path.resolve(dirPath, dirent.name);
      if (dirent.isDirectory()) {
        totalSize += await getDirectorySize(fullPath);
      } else if (dirent.isFile()) {
        const stats = await fs.stat(fullPath);
        totalSize += stats.size;
      }
    }
    return totalSize;
  }

  const appSize = await getDirectorySize(path.resolve(process.cwd(), `${appDistributionName}.app`));
  const appSizeMB = (appSize / 1024 / 1024).toFixed(2);

  // Build completed
  console.log('\n' + '='.repeat(70));
  console.log(`✅ Build Complete!`);
  console.log(`📦 App: ${appDistributionName}.app`);
  console.log(`📍 Size: ${appSizeMB} MB`);
  console.log('='.repeat(70) + '\n');
})();
