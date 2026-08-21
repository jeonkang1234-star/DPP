# EC2에서 Hyperledger Fabric 실제 연동하기

로컬 docker-compose 스택은 `BLOCKCHAIN_ENABLED`를 설정하지 않는다 → `application.yml`의
기본값 `false` → `BlockchainClient`/`FabricGatewayConfig` 빈이 아예 만들어지지 않는다 →
문서·ZKP 앵커링이 **MOCK**(해시는 진짜, tx_id는 `mock-`+해시)으로만 기록된다.

실제 체인에 쓰려면 아래 순서를 EC2에서 한 번 밟으면 된다. 로컬은 계속 MOCK이다.

---

## 0. 사전 확인

```bash
ls /opt/fabric-tools/fabric-samples/test-network/network.sh   # 부트스트랩 때 설치됨
docker --version && docker compose version
java -version                                                  # 체인코드 빌드용 (17이어도 됨)
```

`fabric-samples`가 없으면:

```bash
sudo mkdir -p /opt/fabric-tools && cd /opt/fabric-tools
curl -sSL https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh | bash -s -- --fabric-version 2.5.9 docker samples binaries
```

## 1. 체인코드 빌드 (선택 - 배포에는 필수가 아니다)

3단계의 `network.sh deployCC -ccl java`를 쓰면 **peer가 자기 빌더 이미지 안에서 직접
빌드**한다. 그래서 EC2 호스트에 JDK나 Gradle을 깔 필요가 없다.

다만 컴파일 에러가 있으면 배포 도중에야 터지므로, 먼저 한 번 빌드해 보는 쪽이 낫다.
호스트에 Gradle이 없으면 도커로 일회성 실행:

```bash
cd /opt/app/chaincode                      # 저장소가 클론된 경로 (ls /opt/app 로 확인)
docker run --rm -v "$PWD":/w -w /w gradle:8.7-jdk17 gradle clean build --no-daemon
```

단위테스트 22건이 같이 돈다. `BUILD SUCCESSFUL`이 나오면 3단계로 넘어가면 된다.
(`chaincode/Dockerfile`은 CCaaS 방식으로 배포할 때만 쓰인다 - `deployCC`를 쓰면 필요 없다.)

> `recordZkpVerification`은 2026-08-20에 인자가 하나 늘었다(`proofHash`).
> 예전 버전을 이미 채널에 커밋해 뒀다면 **시퀀스를 올려서 다시 커밋**해야 한다(3단계 `-ccs`).

## 2. 네트워크 기동 + 채널 생성

```bash
cd /opt/fabric-tools/fabric-samples/test-network
./network.sh down                       # 이전 잔재 정리
./network.sh up createChannel -c dppchannel -ca
docker network ls | grep fabric_test    # 오버레이가 붙을 외부 네트워크 이름 확인
```

`network.sh`가 만드는 도커 네트워크 이름이 `fabric_test`가 아니면
`docker/docker-compose.blockchain.yml`의 `networks.fabric_test.name`을 실제 이름으로 맞춘다.

## 3. 체인코드 배포

`build.gradle`의 `mainClass`가 `ContractRouter`라서 external builder / CCaaS 둘 다 된다.
간단한 쪽(peer가 직접 빌드)부터:

```bash
cd /opt/fabric-tools/fabric-samples/test-network
./network.sh deployCC \
  -c dppchannel \
  -ccn dpp-ledger-chaincode \
  -ccp /path/to/DPP/chaincode \
  -ccl java \
  -ccv 1.0 -ccs 1
```

`-ccs`(시퀀스)는 **재배포할 때마다 1씩 올린다**. 위의 `proofHash` 변경처럼 함수 시그니처가
바뀌면 반드시 새 시퀀스로 다시 커밋해야 한다.

배포 확인:

```bash
peer lifecycle chaincode querycommitted -C dppchannel -n dpp-ledger-chaincode
```

## 4. 백엔드가 쓸 인증서 3개 배치

`test-network`의 cryptogen 산출물에서 복사한다(운영 인증서가 아니라 데모/테스트망 전용):

```bash
TN=/opt/fabric-tools/fabric-samples/test-network
ORG1=$TN/organizations/peerOrganizations/org1.example.com
sudo mkdir -p /opt/app/fabric-identity

sudo cp $ORG1/users/Admin@org1.example.com/msp/signcerts/*.pem \
        /opt/app/fabric-identity/admin-cert.pem
sudo cp $ORG1/users/Admin@org1.example.com/msp/keystore/*_sk \
        /opt/app/fabric-identity/admin-key.pem
sudo cp $ORG1/peers/peer0.org1.example.com/tls/ca.crt \
        /opt/app/fabric-identity/peer-tls-ca.pem

ls -l /opt/app/fabric-identity/
```

`.github/workflows/cd.yml`은 배포할 때마다 `admin-cert.pem` 존재 여부를 보고, 있으면
블록체인 오버레이를 자동으로 포함한다. 즉 이 3개 파일을 두는 순간부터 CD가 알아서 켠다.

## 5. 백엔드를 오버레이로 재기동

```bash
cd /opt/app/docker      # 배포된 저장소의 docker/ 디렉터리
docker compose -f docker-compose.yml -f docker-compose.blockchain.yml up -d --build backend
docker logs -f dpp-backend | grep -i fabric
```

`docker-compose.blockchain.yml`의 채널명이 `dppchannel`인지 2단계에서 만든 이름과
일치하는지 확인할 것(`BLOCKCHAIN_CHANNEL_NAME`).

## 6. 실제로 체인에 들어갔는지 확인

문서를 하나 업로드한 뒤:

```sql
-- status가 CONFIRMED이고 tx_id가 'mock-'으로 시작하지 않으면 진짜 체인 트랜잭션이다.
SELECT anchor_id, target_type, status, tx_id, anchored_at
  FROM blockchain_anchor
 ORDER BY anchor_id DESC LIMIT 5;
```

원장 쪽에서 직접 조회:

```bash
peer chaincode query -C dppchannel -n dpp-ledger-chaincode \
  -c '{"function":"getZkpVerification","Args":["<documentId>","<proofId>"]}'
```

`proofHash` 필드가 DB의 `blockchain_anchor.content_hash`(= `sha256(zkp_proof.proof_data)`)와
같으면 오프체인 증명과 원장 기록이 서로 묶여 있는 것이다.

---

## 원장에 무엇이 남는가 (그리고 무엇이 안 남는가)

| 기록 | 남는 것 | 안 남는 것 |
|---|---|---|
| `recordDocumentHash` | 문서 원문의 SHA-256, 문서 종류, 제출 조직, 시각 | 문서 내용 |
| `recordZkpVerification` | 공개입력(기준값·판정), 통과 여부, 검증 주체, 시각, **증명 산출물 해시** | 실측 수치 |

실측 수치(예: 재활용함량 34.2%)는 원장은 물론 백엔드 DB에도 저장하지 않는다
(`DocumentIngestService`: "실측값(private input)은 어디에도 저장하지 않는다").
수치를 그냥 해싱해서 올리지 않는 이유는, 값의 범위가 좁아(0.0~100.0%) 해시만 있으면
전수 대입으로 원값이 드러나기 때문이다. 대신 blinding 난수를 포함한 증명 산출물 자체를
해싱해서 올린다 - "이 판정이 정확히 어떤 증명에서 나왔는가"가 원장에 묶인다.
