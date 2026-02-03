#!/bin/bash
cp ./sidecar/hpatchz/hpatchz ./sophon_server/hpatchz

curl -sSL https://github.com/protocolbuffers/protobuf/releases/download/v31.1/protoc-31.1-osx-universal_binary.zip > protobuf.zip
unzip -o -j protobuf.zip bin/protoc -d bin
rm protobuf.zip

pushd sophon_server
../bin/protoc --python_out=. *.proto

echo "[+] Installing dependencies..."
uv python install 3.13.11
uv sync --python 3.13

echo "[+] Building with PyInstaller..."
uv run --python 3.13 pyinstaller \
  --onefile \
  --name sophon-server \
  --add-data "./hpatchz:." \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.loops.asyncio \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.http.h11_impl \
  --hidden-import uvicorn.protocols.websockets.auto \
  --hidden-import uvicorn.protocols.websockets.websockets_impl \
  --hidden-import uvicorn.lifespan.on \
  --distpath ./dist \
  --workpath ./build_temp \
  server.py

rm ./hpatchz
popd

echo "[+] Build complete!"
ls -lh ./sophon_server/dist/sophon-server
