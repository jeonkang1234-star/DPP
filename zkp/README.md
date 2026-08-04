# DPP ZKP — 재생함량 인증서 (recycled content) 임계치 증명

12번 문서(재생함량 인증서 [Q2_08], ISO 14021 물질수지 방식)를 대상으로 한 첫 ZKP 프로토타입.
"실제 재활용함량 %는 공개하지 않고, 임계치(threshold) 이상이라는 사실만" zk-SNARK(Groth16, circom)로 증명한다.

## 왜 이 조합인가 (circom + snarkjs)
- 가장 널리 쓰이고 문서/튜토리얼이 많은 조합. 초심자도 단순 비교 회로는 몇 시간 내로 작성 가능.
- Groth16 -> 증명 크기 작고 검증 빠름.
- snarkjs는 순수 JS(Node)라 백엔드(Java/Spring)에서는 별도 마이크로서비스나 CLI 호출로 붙이면 됨.
  Fabric 체인코드는 원래도 "검증 결과 true/false"만 받아서 원장에 기록하는 구조라 언어가 달라도 무방.

## 알아둘 점 — 여기서(샌드박스)는 컴파일까지는 못 했음
이 세션(Claude 작업 환경)은 root 권한이 없고 외부 바이너리 다운로드(circom 릴리즈, rustup)가
네트워크 정책상 막혀 있어서, circom 컴파일러 설치 자체가 불가능했다. 그래서:
- `circuits/recycled_content.circom` 회로 코드, 빌드/증명 스크립트 전부는 작성 완료.
- 실제 컴파일(`circom` 실행)과 증명 생성/검증 테스트는 **강님 WSL에서 직접 한 번 돌려봐야** 함.
- snarkjs 자체(Powers of Tau 생성 등, circom 컴파일러 불필요한 부분)는 이 샌드박스에서 정상 동작 확인함.

## 실행 순서 (WSL, Ubuntu)

```bash
cd ~/fabric  # 아무 작업 디렉토리에 zkp 폴더 복사해서 진행해도 됨
cd zkp
npm install

# 1) circom 컴파일러 + snarkjs CLI 설치 (최초 1회, 몇 분 소요)
bash scripts/01_install_circom.sh

# 2) 회로 컴파일
npm run compile

# 3) 신뢰 설정 (로컬에서 새로 생성, 외부 다운로드 없음)
npm run setup

# 4) 테스트: RC-STRUCTA-2025-0004 28.0% vs 임계치 20% -> 증명 성공해야 함
npm run test:pass

# 5) 테스트: RC-VSS2-2025-0001 19.5% vs 임계치 30% -> 증명 실패해야 함 (거짓 주장이므로 정상)
npm run test:fail
```

`test:pass`가 성공하면 마지막에 `recordZkpVerification` 호출용 JSON이 출력됨
(`docId`, `proofId`, `publicInputsJson`, `verified`, `verifier`, `timestamp`) —
이 값 그대로 어제 만든 체인코드 invoke에 넣으면 온체인 기록까지 이어짐.

## 실제 파싱 데이터 (2025-08-04 확보)

`parser/sample_docs/Q2_08_샘플_재생함량인증서_10건.pdf` 업로드받아서 파서 돌린 결과
(`parser/sample_output/Q2_08.json`)에 실제 10건이 들어있음. 필드명은
`sustainability_metrics.recycled_content_weighted_avg_percent` (제품 전체 가중평균 %).

| docId | 제품 | 재생함량(%) |
|---|---|---|
| RC-VSS2-2025-0001 | 배터리 | 19.5 |
| RC-AURAX1-2025-0002 | 스마트폰 | 18.6 |
| RC-NORDICW-2025-0003 | 니트 스웨터 | 100.0 |
| RC-STRUCTA-2025-0004 | 철강 빔 | 28.0 |
| RC-HELIOS-2025-0005 | 태양광 패널 | 25.0 |
| RC-PURELINE-2025-0006 | 면 티셔츠 | 100.0 |
| RC-FORGE-2025-0007 | 드릴 공구 | 17.6 |
| RC-COILMAX-2025-0008 | 철강 코일 | 22.0 |
| RC-TERRA-2025-0009 | 등산화 | 80.0 |
| RC-ECOCELL-2025-0010 | 보조배터리 | 18.8 |

임계값(threshold)은 아직 팀원이 확정 기준을 전달하기 전이라 20/30 같은 임의값으로 테스트 중.
기준 받으면 `npm run test:pass`/`test:fail` 스크립트의 두 번째 인자만 바꾸면 됨:
```bash
node scripts/04_prove_and_verify.js <실제%> <임계값%> <docId>
```

## 다음 단계 (여기서부터는 아직 안 함)
- 팀원에게 실제 임계값 기준 받기 (지금은 임의값으로 배관만 확인)
- Java 백엔드에서 이 Node 스크립트(또는 소켓/HTTP로 감싼 서비스)를 호출하는 연동 코드
- `verification_key.json`을 어디에 배포/보관할지 (체인코드 안에 내장 vs 별도 서비스)
- 10건 전체를 배치로 돌려서 recordZkpVerification까지 체인 invoke 자동화
