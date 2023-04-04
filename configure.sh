base64 -d -i ./src/constants/server_secret.b64 -o ./src/constants/server_secret.ts

EXTERNAL="./external"

rm -rf "$EXTERNAL"
mkdir -p "$EXTERNAL"
mkdir -p ./tmp
git clone $(echo "aHR0cHM6Ly9ub3RhYnVnLm9yZy9Lcm9jay9kYXduCg==" | base64 --decode) ./tmp
cp -R ./tmp/350/patch_files/. "$EXTERNAL"
rm -rf ./tmp
pushd "$EXTERNAL"
# for file in * ; do echo "$file" "$(basename $file | base64 )"."${file##*.}" ; done
for file in * ; do mv "$file" "$(basename $file | base64 )"."${file##*.}" ; done
popd

curl -sSL https://github.com/3Shain/neutralinojs/releases/download/v4.11.0-1/neutralinojs-v4.11.0-1.zip > neu.zip
unzip -o -d bin neu.zip
rm neu.zip

curl -sSL https://github.com/neutralinojs/neutralino.js/releases/download/v3.9.0/neutralino.js > neutralino.js