#!/bin/bash
cp ./sidecar/hpatchz/hpatchz ./sophon_server/hpatchz
pushd sophon_server
uv sync
NUITKA_CACHE_DIR=./.cache uv run nuitka \
--warn-implicit-exceptions \
--warn-unusual-code \
--standalone \
--python-flag=isolated \
--include-data-files=./hpatchz=./hpatchz \
--output-filename=sophon-server \
--output-dir=./build \
--assume-yes-for-downloads \
server.py
chmod +x ./build/sophon-server
rm ./hpatchz
popd
