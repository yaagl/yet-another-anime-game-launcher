#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

repository=yaagl/yet-another-anime-game-launcher
tag=${RELEASE_TAG:?Release tag is required}
: "${SPARKLE_PRIVATE_ED_KEY:?Sparkle signing key is required}"
[ "$tag" != updates ]
sdk=$(bash ./build-updater.sh)
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
shopt -s nullglob
download_prefix="https://github.com/$repository/releases/download/$tag/"

create_release=false
if gh release view updates --repo "$repository" --json assets > "$stage/updates.json"; then
  if jq -e '.assets[] | select(.name | test("^appcast_[a-z0-9]+\\.xml$"))' "$stage/updates.json" > /dev/null; then
    gh release download updates --repo "$repository" --pattern 'appcast_*.xml' --dir "$stage"
  fi
else
  create_release=true
fi
for feed in "$stage"/appcast_*.xml; do
  printf '%s\n' "$SPARKLE_PRIVATE_ED_KEY" | "$sdk/bin/sign_update" --verify --ed-key-file - "$feed"
done

# Remove this tag before regeneration, including promotions and withdrawn releases.
python3 - "$stage" "$download_prefix" <<'PY'
import pathlib, sys, urllib.parse, xml.etree.ElementTree as ET
ET.register_namespace("sparkle", "http://www.andymatuschak.org/xml-namespaces/sparkle")
for path in pathlib.Path(sys.argv[1]).glob("appcast_*.xml"):
    tree = ET.parse(path)
    channel = tree.getroot().find("channel")
    for item in list(channel.findall("item")):
        enclosure = item.find("enclosure")
        if enclosure is not None and urllib.parse.unquote(enclosure.get("url", "")).startswith(sys.argv[2]):
            channel.remove(item)
    tree.write(path, encoding="utf-8", xml_declaration=True)
PY

if [[ "${RELEASE_ACTION:-}" != deleted && "${RELEASE_ACTION:-}" != unpublished ]]; then
  gh release view "$tag" --repo "$repository" --json body,isPrerelease,isDraft,tagName > "$stage/release.json"
  if jq -e '.isDraft | not' "$stage/release.json" > /dev/null; then
    gh release download "$tag" --repo "$repository" --pattern '*.zip' --dir "$stage"
    appcast_args=(--ed-key-file - --maximum-deltas 0 --maximum-versions 0 --embed-release-notes)
    version_tag=${tag%%+*}
    if [[ "$version_tag" == *-* ]] || jq -e '.isPrerelease' "$stage/release.json" > /dev/null; then
      label=${version_tag#*-}
      label=${label%%.*}
      label=$(printf '%s' "$label" | tr '[:upper:]' '[:lower:]' | sed -E 's/[0-9]+$//')
      case "$label" in alpha|beta|rc) ;; *) label=prerelease ;; esac
      appcast_args+=(--channel "$label")
    fi
    for archive in "$stage"/*.zip; do
      plist=$(zipinfo -1 "$archive" | sed -n '/^[^/]*\.app\/Contents\/Info.plist$/p')
      unzip -p "$archive" "$plist" > "$stage/Info.plist"
      build_version=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$stage/Info.plist")
      client=$(/usr/libexec/PlistBuddy -c 'Print :YAAGLClient' "$stage/Info.plist")
      [[ "$client" =~ ^[a-z0-9]+$ ]]
      # Sparkle requires a separate input directory per app, even at the same version.
      directory="$stage/$client"
      mkdir "$directory"
      name=$(basename "$archive" .zip)
      mv "$archive" "$directory/"
      jq -r '.body // ""' "$stage/release.json" > "$directory/$name.md"
      printf '%s\n' "$SPARKLE_PRIVATE_ED_KEY" | "$sdk/bin/generate_appcast" \
        "${appcast_args[@]}" --versions "$build_version" \
        --download-url-prefix "$download_prefix" -o "$stage/appcast_$client.xml" "$directory"
    done
  fi
fi

feeds=("$stage"/appcast_*.xml)
[ "${#feeds[@]}" -gt 0 ]
for feed in "${feeds[@]}"; do
  # generate_appcast only warns on a mismatched key; never publish unsigned archives.
  [ "$(xmllint --xpath 'count(//enclosure[not(@*[local-name()="edSignature"])])' "$feed")" = 0 ]
  printf '%s\n' "$SPARKLE_PRIVATE_ED_KEY" | "$sdk/bin/sign_update" --ed-key-file - "$feed"
  printf '%s\n' "$SPARKLE_PRIVATE_ED_KEY" | "$sdk/bin/sign_update" --verify --ed-key-file - "$feed"
done
if "$create_release"; then
  gh release create updates --repo "$repository" --prerelease --latest=false \
    --title 'Update feeds' --notes 'Signed Sparkle update feeds. Download installers from versioned releases.'
fi
gh release upload updates --repo "$repository" --clobber "${feeds[@]}"
