# DPP Ledger Chaincode

문서파싱 → **블록체인 기록** → 오프체인 ZKP 검증 → **블록체인 기록** 파이프라인에서, 블록체인 쪽 두 지점을 담당하는 체인코드입니다. 페어링 연산 같은 무거운 암호 검증은 여기 없습니다 — 오프체인(백엔드)에서 검증 끝난 결과만 기록하는 "기록계" 역할입니다.

## 함수

| 함수 | 역할 |
|---|---|
| `recordDocumentHash(docId, docType, docHash, submitter, timestamp)` | 문서 파싱 단계에서 나온 `text_sha256`을 원장에 기록. 같은 docId로 재기록 불가(최초 1회만) |
| `getDocumentHash(docId)` | 기록된 해시 조회 — 나중에 원본을 다시 해싱해서 이 값과 비교하면 위변조 여부 확인 가능 |
| `recordZkpVerification(docId, proofId, publicInputsJson, verified, verifier, timestamp)` | 오프체인에서 끝난 ZKP 검증 결과 기록. 대상 문서 해시가 먼저 기록돼 있어야 함 |
| `getZkpVerification(docId, proofId)` | 검증 기록 조회 |

## ⚠️ 아직 컴파일/배포 테스트 안 됨

이 세션 환경엔 Fabric 관련 Maven 의존성(`fabric-chaincode-shim`)을 받을 네트워크 접근이 안 돼서, 실제로 `gradle build`를 돌려보지 못했습니다. 문법은 신중하게 작성했지만, `fabric-chaincode-java` 버전에 따라 `ChaincodeStub.getStringState`/`putStringState` 같은 메서드 시그니처가 미묘하게 다를 수 있어서 **여러분 환경에서 한 번 빌드해보고 에러 나면 알려주세요.**

빌드 확인 (로컬 또는 EC2, 인터넷 되는 곳에서):
```bash
cd chaincode
gradle build
```

문제 생기면 `fabric-samples/asset-transfer-basic/chaincode-java`(공식 샘플)와 비교해서 API 차이 확인하면 됩니다. `/opt/fabric-tools`에 이미 `fabric-samples`가 받아져 있을 거예요 (EC2 부트스트랩 때 설치됨).

## 다음 단계 (아직 안 한 것)

1. **Fabric 네트워크 실제로 띄우기** — EC2에 Fabric 바이너리/도커 이미지는 설치돼 있지만(`/opt/fabric-tools`), 채널 생성·Org 설정·peer/orderer 기동은 아직 안 했습니다. `fabric-samples/test-network`의 `network.sh up createChannel`로 시작하면 됩니다.
2. 이 체인코드를 채널에 설치(install) + 승인(approve) + 커밋(commit)
3. 백엔드(Spring Boot)에 `fabric-gateway` 클라이언트 의존성 추가해서 `recordDocumentHash`/`recordZkpVerification` 호출하는 서비스 코드 작성
4. 문서파싱(Python) 결과의 `text_sha256`을 이 체인코드로 넘기는 연동 코드 작성

## 데이터 흐름 요약

```
문서 PDF
  └─ (Python 파서) → text_sha256, 원본 필드값
       ├─ 원본 필드값 → 암호화된 비공개 저장소 (DB) — ZKP witness로 나중에 사용
       └─ text_sha256 → recordDocumentHash() → 블록체인

ZKP 증명 (예: 재활용함량 ≥ 30%)
  └─ (백엔드, snarkjs 등) → 오프체인 검증 → 참/거짓
       └─ 참/거짓 + 공개입력 → recordZkpVerification() → 블록체인
```
