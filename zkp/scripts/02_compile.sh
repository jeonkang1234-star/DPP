#!/usr/bin/env bash
# 회로 컴파일: .circom -> r1cs / wasm / sym
set -e
cd "$(dirname "$0")/.."

mkdir -p build
circom circuits/recycled_content.circom \
  --r1cs --wasm --sym \
  -l node_modules \
  -o build

echo ">> 컴파일 완료. build/ 안 내용:"
ls -la build build/recycled_content_js
