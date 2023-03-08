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
