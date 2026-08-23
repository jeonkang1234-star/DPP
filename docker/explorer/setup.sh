#!/usr/bin/env bash
# Hyperledger Explorer 기동 준비 - 경로/키파일명을 자동으로 찾아 설정 파일을 만든다.
#
# 사용법:
#   cd /opt/app/docker/explorer
#   ./setup.sh /경로/fabric-samples/test-network
#
# 손으로 커넥션 프로파일을 편집하지 않는 이유: 이 설정에서 실패하는 지점은 거의 항상
# (1) admin 개인키 파일 이름, (2) crypto 디렉터리 호스트 경로 두 개다. cryptogen으로
# 만들면 키 이름이 priv_sk지만 Fabric CA(-ca 옵션)로 만들면 랜덤 해시_sk가 된다.
set -euo pipefail

TN_PATH="${1:-}"
if [ -z "$TN_PATH" ]; then
  echo "사용법: ./setup.sh /경로/fabric-samples/test-network" >&2
  exit 1
fi

CRYPTO="$TN_PATH/organizations"
if [ ! -d "$CRYPTO/peerOrganizations/org1.example.com" ]; then
  echo "ERROR: $CRYPTO/peerOrganizations/org1.example.com 이 없습니다." >&2
  echo "       test-network 경로가 맞는지 확인하세요 (network.sh가 있는 디렉터리)." >&2
  exit 1
fi

KEYDIR="$CRYPTO/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore"
PRIV_KEY_FILE="$(ls -1 "$KEYDIR" | head -n 1 || true)"
if [ -z "$PRIV_KEY_FILE" ]; then
  echo "ERROR: $KEYDIR 안에 개인키 파일이 없습니다." >&2
  exit 1
fi
echo "  admin 개인키 파일: $PRIV_KEY_FILE"

TLS_CA="$CRYPTO/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt"
[ -f "$TLS_CA" ] || { echo "ERROR: TLS CA가 없습니다: $TLS_CA" >&2; exit 1; }

# 기본 비밀번호를 그대로 쓰지 않는다. EXPLORER_ADMIN_PW를 미리 export 하면 그 값을 쓴다.
ADMIN_ID="${EXPLORER_ADMIN_ID:-exploreradmin}"
ADMIN_PW="${EXPLORER_ADMIN_PW:-}"
if [ -z "$ADMIN_PW" ]; then
  ADMIN_PW="$(head -c 12 /dev/urandom | base64 | tr -d '/+=' | head -c 12)"
  echo "  Explorer 로그인 비밀번호를 새로 생성했습니다."
fi

mkdir -p connection-profile
sed -e "s#__PRIV_KEY_FILE__#${PRIV_KEY_FILE}#" \
    -e "s#__EXPLORER_ADMIN_ID__#${ADMIN_ID}#" \
    -e "s#__EXPLORER_ADMIN_PW__#${ADMIN_PW}#" \
    connection-profile/dpp-network.json.template > connection-profile/dpp-network.json
chmod 600 connection-profile/dpp-network.json

cat > .env <<EOF
EXPLORER_CONFIG_FILE_PATH=$(pwd)/config.json
EXPLORER_PROFILE_DIR_PATH=$(pwd)/connection-profile
FABRIC_CRYPTO_PATH=${CRYPTO}
# 호스트 포트 - backend가 8080을 쓰므로 8090을 기본으로 쓴다.
EXPLORER_HOST_PORT=8090
# 기본은 로컬 바인딩. 퍼블릭 IP로 열려면 0.0.0.0으로 바꾸고 보안그룹을 내 IP로 제한할 것.
EXPLORER_BIND=127.0.0.1
EOF
chmod 600 .env

echo
echo "설정 완료."
echo "  로그인 ID : ${ADMIN_ID}"
echo "  비밀번호  : ${ADMIN_PW}"
echo "  (connection-profile/dpp-network.json 안에도 들어 있습니다)"
echo
echo "다음: docker compose up -d   (접속은 호스트 포트 8090)"
