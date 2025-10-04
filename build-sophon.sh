#!/bin/bash
cp ./sidecar/hpatchz/hpatchz ./sophon_server/hpatchz

curl -sSL https://github.com/protocolbuffers/protobuf/releases/download/v31.1/protoc-31.1-osx-universal_binary.zip > protobuf.zip
unzip -o -j protobuf.zip bin/protoc -d bin
rm protobuf.zip

pushd sophon_server
../bin/protoc --python_out=. *.proto
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
rm ./hpatchz
popd
