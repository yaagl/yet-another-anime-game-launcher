#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "[+] Installing dependencies..."
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
  --distpath ./build \
  --clean \
  server.py

echo "[+] Build complete!"
ls -lh ./build/sophon-server
