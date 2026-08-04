// 사용법: node scripts/04_prove_and_verify.js <실제%> <임계값%> [docId]
// 예:    node scripts/04_prove_and_verify.js 19.5 30 RC-VSS2-2025-0001   -> 증명 실패 기대 (19.5 < 30)
//        node scripts/04_prove_and_verify.js 28.0 20 RC-STRUCTA-2025-0004 -> 증명 성공 기대 (28.0 >= 20)
//
// 퍼센트는 소수점 한 자리까지 지원 (파서가 뽑는 실제 값 형식과 동일).
// 내부적으로 x10 고정소수점 정수로 변환해서 회로에 넣는다 (19.5% -> 195).
//
// 실제 % 값(actualPercentX10)은 private input이라 proof.json / public.json 어디에도 안 남는다.
// public.json에는 thresholdX10과 isAboveThreshold(=1)만 남는다.

const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

const BUILD = path.join(__dirname, "..", "build");
const WASM = path.join(BUILD, "recycled_content_js", "recycled_content.wasm");
const ZKEY = path.join(BUILD, "recycled_content_final.zkey");
const VKEY = path.join(BUILD, "verification_key.json");

function toX10(percentStr) {
  // "19.5" -> 195, "100" -> 1000, 소수점 둘째 자리 이하는 반올림
  return Math.round(parseFloat(percentStr) * 10);
}

async function main() {
  const actualPercentX10 = toX10(process.argv[2] ?? "45");
  const thresholdX10 = toX10(process.argv[3] ?? "30");
  const docId = process.argv[4] ?? "DOC-TEST-001";

  for (const p of [WASM, ZKEY, VKEY]) {
    if (!fs.existsSync(p)) {
      console.error(`필요한 파일이 없습니다: ${p}`);
      console.error("먼저 npm run compile && npm run setup 을 실행하세요.");
      process.exit(1);
    }
  }

  console.log(
    `\n입력: actualPercent(private)=${actualPercentX10 / 10}% (x10=${actualPercentX10}), ` +
    `threshold(public)=${thresholdX10 / 10}% (x10=${thresholdX10}), docId=${docId}`
  );

  const input = { actualPercentX10, thresholdX10 };

  let proof, publicSignals;
  try {
    ({ proof, publicSignals } = await snarkjs.groth16.fullProve(input, WASM, ZKEY));
  } catch (err) {
    console.log("\n증명 생성 실패 — actualPercent < threshold 이므로 정상적인 결과입니다 (거짓 주장은 증명 불가).");
    console.log("verified = false");
    return;
  }

  const vkey = JSON.parse(fs.readFileSync(VKEY));
  const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);

  console.log("\n증명 생성 + 검증 성공");
  console.log("publicSignals (공개값만, 실제 %는 없음):", publicSignals);
  console.log("verified =", ok);

  // recordZkpVerification 체인코드 함수에 넘길 형태로 정리
  const record = {
    docId,
    proofId: `PROOF-${Date.now()}`,
    publicInputsJson: JSON.stringify({ thresholdPercent: thresholdX10 / 10 }),
    verified: ok,
    verifier: "zkp-verifier-service",
    timestamp: new Date().toISOString(),
  };
  console.log("\n--- recordZkpVerification 호출용 값 ---");
  console.log(JSON.stringify(record, null, 2));

  fs.writeFileSync(path.join(BUILD, "last_proof.json"), JSON.stringify(proof, null, 2));
  fs.writeFileSync(path.join(BUILD, "last_public.json"), JSON.stringify(publicSignals, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
