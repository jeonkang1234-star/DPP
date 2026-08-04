#!/usr/bin/env bash
# WSL(Ubuntu)에서 한 번만 실행. circom 컴파일러 설치.
# circom은 crates.io에 없어서 cargo install로는 안 됨 -> GitHub 릴리즈의
# 사전 컴파일된 바이너리를 바로 받아서 씀 (Rust 빌드 불필요, 훨씬 빠름).
set -e

echo ">> circom 컴파일러 다운로드 중..."
curl -L -o /tmp/circom https://github.com/iden3/circom/releases/latest/download/circom-linux-amd64
chmod +x /tmp/circom
sudo mv /tmp/circom /usr/local/bin/circom

echo ">> snarkjs CLI 전역 설치..."
npm install -g snarkjs

echo ">> 확인:"
circom --version
snarkjs --version
