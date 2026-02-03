#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "[+] Installing dependencies..."
uv sync --python 3.13

echo "[+] Cleaning previous builds..."
rm -rf build dist sophon-server sophon-server.spec

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
  -y \
  --clean \
  server.py

echo "[+] Build complete!"
ls -lh ./dist/sophon-server

