base64 -d -i ./src/clients/secret.b64 -o ./src/clients/secret.ts

EXTERNAL="./external"

rm -rf "$EXTERNAL"
mkdir -p "$EXTERNAL/hk4e"
mkdir -p "$EXTERNAL/bh3/diffs"
mkdir -p "$EXTERNAL/bh3/files"

mkdir -p "$EXTERNAL/hk4e"
mkdir -p ./tmp
git clone $(echo "aHR0cHM6Ly9ub3RhYnVnLm9yZy9Lcm9jay9kYXduCg==" | base64 --decode) ./tmp
cp -R ./tmp/360/patch_files/. "$EXTERNAL/hk4e"
rm -rf ./tmp
git clone $(echo "aHR0cHM6Ly9ub3RhYnVnLm9yZy9ta3JzeW0xL2R1c2s=" | base64 --decode) ./tmp
cp -R ./tmp/diffs/. "$EXTERNAL/bh3/diffs"
cp -R ./tmp/files/. "$EXTERNAL/bh3/files"
rm -rf ./tmp
pushd "$EXTERNAL/hk4e"
# for file in * ; do echo "$file" "$(basename $file | base64 )"."${file##*.}" ; done
for file in * ; do mv "$file" "$(basename $file | base64 )"."${file##*.}" ; done
popd
pushd "$EXTERNAL/bh3/diffs"
for file in * ; do mv "$file" "$(basename $file | base64 )"."${file##*.}" ; done
popd
pushd "$EXTERNAL/bh3/files/Generated"
for file in * ; do mv "$file" "$(basename $file | base64 )"."${file##*.}" ; done
popd
pushd "$EXTERNAL/bh3/files"
for file in * ; do mv "$file" "$(basename $file | base64 )"."${file##*.}" ; done
popd

curl -sSL https://github.com/3Shain/neutralinojs/releases/download/v4.11.0-1/neutralinojs-v4.11.0-1.zip > neu.zip
unzip -o -d bin neu.zip
rm neu.zip

curl -sSL https://github.com/neutralinojs/neutralino.js/releases/download/v3.9.0/neutralino.js > neutralino.js