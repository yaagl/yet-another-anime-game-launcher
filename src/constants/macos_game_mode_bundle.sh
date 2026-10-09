#!/bin/sh
# Usage: macos_game_mode_bundle.sh <bundle> <wine dir> <app name> <bundle id> [icon]
#
# macOS only turns on Game Mode for processes inside an app bundle whose
# Info.plist declares a game category. Wine re-executes its loader from
# lib/wine/x86_64-unix, so this builds an app bundle whose Contents/MacOS holds
# hard links to that directory (symlinks would be resolved back to lib/).
set -eu

bundle=$1
wine_dir=$2
name=$3
bundle_id=$4
icon=${5:-}
unix_dir="$wine_dir/lib/wine/x86_64-unix"
macos_dir="$bundle/Contents/MacOS"
lsregister=/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister

[ -f "$unix_dir/wine" ] && [ -f "$unix_dir/ntdll.so" ] || exit 3

# Up to date while the bundle still links to the installed Wine's files.
if [ "$macos_dir/wine" -ef "$unix_dir/wine" ] &&
  [ "$macos_dir/ntdll.so" -ef "$unix_dir/ntdll.so" ]; then
  exit 0
fi

rm -rf "$bundle"
mkdir -p "$macos_dir" "$bundle/Contents/Resources"
for f in "$unix_dir"/*; do
  n=$(basename "$f")
  if [ -L "$f" ]; then
    ln -s "$(readlink "$f")" "$macos_dir/$n"
  else
    ln "$f" "$macos_dir/$n"
  fi
done
ln -s . "$macos_dir/x86_64-unix"
for d in x86_64-windows i386-windows; do
  if [ -e "$wine_dir/lib/wine/$d" ]; then
    ln -s "$wine_dir/lib/wine/$d" "$macos_dir/$d"
  fi
done

# Wine derives bin/ and share/ from the loader location, and the unix modules'
# rpaths point two levels up (@loader_path/../../), which is the bundle root.
ln -s "$wine_dir/bin" "$bundle/bin"
ln -s "$wine_dir/share" "$bundle/share"
for f in "$wine_dir/lib"/*; do
  n=$(basename "$f")
  if [ "$n" != wine ]; then
    ln -s "$f" "$bundle/$n"
  fi
done

icon_key=""
if [ -n "$icon" ] && [ -f "$icon" ]; then
  cp "$icon" "$bundle/Contents/Resources/AppIcon.icns"
  icon_key="<key>CFBundleIconFile</key><string>AppIcon</string>"
fi

cat >"$bundle/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key><string>wine</string>
  <key>CFBundleIdentifier</key><string>$bundle_id</string>
  <key>CFBundleName</key><string>$name</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  $icon_key
  <key>LSApplicationCategoryType</key><string>public.app-category.role-playing-games</string>
  <key>LSSupportsGameMode</key><true/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
EOF

# No codesign: Contents/MacOS/wine is a hard link to Wine's own loader.
"$lsregister" -f "$bundle"
