# Hyperledger Explorer (데모용 블록 탐색기)

Fabric 원장을 웹 UI로 들여다보기 위한 것. **앱과는 완전히 분리**돼 있어서 여기서 뭘 하든
DPP 플랫폼 동작에 영향이 없다(읽기 전용으로 peer에 붙는다).

> 이 도구(hyperledger-labs/blockchain-explorer)는 **2026-02-05에 아카이브**됐다.
> 마지막 릴리스 v2.0.0이 Fabric 2.2/2.4/2.5를 지원하고 우리는 2.5.16이라 동작은 하지만,
> 더 이상 유지보수되지 않는다는 점을 알고 쓸 것.

## 전제조건
- EC2에 test-network가 떠 있고 `dppchannel`에 `dpp-ledger-chaincode`가 커밋된 상태
- 도커 네트워크 `fabric_test` 존재 (`docker network ls | grep fabric_test`)
- 여유 메모리 1GB 이상 (`free -h`) — Explorer + 전용 PostgreSQL이 추가로 뜬다

## 설치
```bash
cd /opt/app/docker/explorer
bash setup.sh /경로/fabric-samples/test-network   # 키 파일명·경로 자동 탐지 후 .env 생성
docker compose up -d
docker compose logs -f explorer.mynetwork.com     # "Synchronizer pid is..." 나오면 정상
```

## 접속
기본은 `127.0.0.1:8090`에만 바인딩된다(호스트 8080은 backend가 이미 쓴다)(퍼블릭 IP에 기본 비밀번호로 열지 않기 위함).
로컬 PC에서 SSH 터널로 본다:
```bash
ssh -N -L 8090:localhost:8090 ubuntu@15.134.9.240
# 브라우저: http://localhost:8090
```
데모 중 화면에 띄워야 하면 `.env`의 `EXPLORER_BIND=0.0.0.0`으로 바꾸고
**보안그룹 8090을 내 IP/32로만** 열 것. 로그인 정보는 setup.sh 출력과
`connection-profile/dpp-network.json`에 있다.

## 무엇을 확인하나
- **Blocks**: 블록 번호·트랜잭션 수·시각. 우리 DB `blockchain_anchor.block_no`와 같아야 한다.
- **Transactions**: tx id를 검색하면 그 트랜잭션의 체인코드/인자/타임스탬프가 보인다.
  `SELECT tx_id FROM blockchain_anchor WHERE status='CONFIRMED'` 로 나온 값을 그대로 넣어 대조.
- **Chaincodes**: `dpp-ledger-chaincode` 호출 횟수.
- **Channels**: `dppchannel` 블록 높이 = `peer channel getinfo -c dppchannel` 결과와 일치.

## 정리
```bash
docker compose down -v      # -v 는 Explorer 전용 DB까지 삭제(원장에는 영향 없음)
```
