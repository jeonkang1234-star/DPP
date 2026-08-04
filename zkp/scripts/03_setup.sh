#!/usr/bin/env bash
# 신뢰 설정(trusted setup): Powers of Tau (범용) + 회로 전용 Groth16 zkey.
# 공개 세리모니 파일을 다운로드하지 않고 로컬에서 새로 생성 -> 완전 오프라인.
# (학습/테스트 프로젝트용. 프로덕션에서는 다자간 공개 세리모니를 쓰는 게 원칙이지만
#  이 프로젝트 목적(로컬 Fabric test-network 검증)에는 이 방식으로 충분함)
set -e
cd "$(dirname "$0")/.."
mkdir -p build/pot

POT=build/pot

echo ">> Powers of Tau 새로 생성..."
npx snarkjs powersoftau new bn128 12 $POT/pot12_0000.ptau -v

echo ">> 1차 기여(contribution)..."
npx snarkjs powersoftau contribute $POT/pot12_0000.ptau $POT/pot12_0001.ptau \
  --name="DPP local contribution" -v -e="$(date +%s)-$RANDOM"

echo ">> Phase2 준비..."
npx snarkjs powersoftau prepare phase2 $POT/pot12_0001.ptau $POT/pot12_final.ptau -v

echo ">> Groth16 zkey 생성 (회로 전용)..."
npx snarkjs groth16 setup build/recycled_content.r1cs $POT/pot12_final.ptau build/recycled_content_0000.zkey

echo ">> zkey 기여..."
npx snarkjs zkey contribute build/recycled_content_0000.zkey build/recycled_content_final.zkey \
  --name="DPP zkey contribution" -v -e="$(date +%s)-$RANDOM"

echo ">> 검증키(verification key) 추출..."
npx snarkjs zkey export verificationkey build/recycled_content_final.zkey build/verification_key.json

echo ">> setup 완료. build/verification_key.json 은 백엔드/체인코드 쪽에 배포해서 검증에 쓰면 됨."
