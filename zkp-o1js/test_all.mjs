// 8개 회로 전체를 실제 mock 데이터(judge.py로 이미 검증된 값)로 증명 생성 -> 검증까지
// 돌리고, judge.py가 계산한 판정과 회로의 Bool 출력이 일치하는지 자동 대조한다.
//
// 데이터 출처: dpp-doc-parser/judge.py를 mock PDF 10건에 실제로 돌려서 얻은 값
// (2026-08-08 조사). 대부분 항목은 mock 데이터가 전부 "적합"이라 FAIL 사례가 없어서,
// FAIL/경계 사례가 실제로 존재하는 항목(배터리 Co, 재활용 코발트)은 실제 값을 쓰고,
// 그 외 FAIL이 필요한 항목은 "[합성]" 표시를 달고 임의로 만든 값을 썼다 - 실제
// mock 문서에서 나온 값이 아니라는 뜻이니 혼동하지 말 것.

import { Field, Bool, verify } from 'o1js';
import * as C from './circuits.mjs';

let pass = 0, fail = 0;
const summary = [];

function checkBool(label, actual, expected) {
  const a = actual.toBoolean();
  const ok = a === expected;
  summary.push(`${ok ? 'OK ' : 'XX '} ${label}: 회로=${a} / 기대(judge.py)=${expected}`);
  if (ok) pass++; else fail++;
}

async function runAndVerify(name, program, methodName, pub, priv, checks, privateValuesToScan) {
  console.log(`\n=== ${name} ===`);
  let t = Date.now();
  const { verificationKey } = await program.compile();
  console.log(`compile: ${Date.now() - t}ms`);

  t = Date.now();
  const { proof } = await program[methodName](pub, priv);
  console.log(`prove: ${Date.now() - t}ms`);

  t = Date.now();
  const ok = await verify(proof, verificationKey);
  console.log(`verify: ${Date.now() - t}ms -> ${ok}`);
  if (!ok) { console.log('!! 증명 검증 실패 - 심각한 문제'); fail++; }
  else pass++;
  summary.push(`${ok ? 'OK ' : 'XX '} ${name} 증명 검증 결과: ${ok}`);

  // 판정 대조
  checks(proof.publicOutput);

  // 참고용 프라이버시 체크 (완전하지 않음 - README 참고)
  if (privateValuesToScan && privateValuesToScan.length) {
    const proofJson = JSON.stringify(proof.toJSON());
    const leaked = privateValuesToScan.filter(v => proofJson.includes(`"${v}"`));
    console.log(`측정값 문자열 스캔(참고용): ${leaked.length ? '일치 발견 ' + leaked.join(',') : '없음'}`);
  }
}

// ---------------------------------------------------------------------------
// 1. Q2_05 제강성적서 (instance 1, 전항목 적합 - 기존 프로토타입과 동일 데이터)
// ---------------------------------------------------------------------------
await runAndVerify(
  'Q2_05 제강성적서', C.SteelMillCheck, 'checkAll',
  new C.SteelLimits({ C: Field(240), Si: Field(550), Mn: Field(1600), P: Field(35), S: Field(35),
    N: Field(12), Cu: Field(550), CEV: Field(470), ReH_min: Field(355), Rm_low: Field(470),
    Rm_high: Field(630), A_min: Field(22), KV_min: Field(27) }),
  new C.SteelMeasured({ C: Field(180), Si: Field(350), Mn: Field(1400), P: Field(18), S: Field(12),
    N: Field(8), Cu: Field(220), CEV: Field(420), ReH: Field(382), Rm: Field(524), A: Field(26), KV: Field(48) }),
  (out) => {
    for (const k of ['C','Si','Mn','P','S','N','Cu','CEV','ReH','Rm','A','KV']) {
      checkBool(`Q2_05 ${k}`, out[k], true); // instance1은 12개 전부 적합
    }
  },
  [180,350,1400,18,12,8,220,420,382,524,26,48],
);

// ---------------------------------------------------------------------------
// 2. Q2_06 CBAM (instance1=62.4t 의무발생, instance2=2140.0t 의무발생, [합성]30.0t 면제)
// ---------------------------------------------------------------------------
await runAndVerify(
  'Q2_06 CBAM instance1(62.4t)', C.CbamCheck, 'checkObligation',
  new C.CbamPublic({ deMinimisX10: Field(500) }),
  new C.CbamPrivate({ qtyX10: Field(624) }),
  (out) => checkBool('Q2_06 instance1 의무발생', out, true),
  [624],
);
await runAndVerify(
  'Q2_06 CBAM instance2(2140.0t)', C.CbamCheck, 'checkObligation',
  new C.CbamPublic({ deMinimisX10: Field(500) }),
  new C.CbamPrivate({ qtyX10: Field(21400) }),
  (out) => checkBool('Q2_06 instance2 의무발생', out, true),
  [21400],
);
await runAndVerify(
  'Q2_06 CBAM [합성]30.0t 면제대상', C.CbamCheck, 'checkObligation',
  new C.CbamPublic({ deMinimisX10: Field(500) }),
  new C.CbamPrivate({ qtyX10: Field(300) }),
  (out) => checkBool('Q2_06 [합성] 면제대상', out, false),
  [300],
);

// ---------------------------------------------------------------------------
// 3. Q1_04 섬유 혼용률 합계 (instance1: 80/15/5, instance2: 95/5, [합성] 98 미달)
// ---------------------------------------------------------------------------
const fiberPub = new C.FiberPublic({ targetX10: Field(1000), toleranceX10: Field(5) });
await runAndVerify(
  'Q1_04 섬유 instance1(80+15+5=100)', C.FiberSumCheck, 'checkSum', fiberPub,
  new C.FiberPrivate({ p1: Field(800), p2: Field(150), p3: Field(50), p4: Field(0) }),
  (out) => checkBool('Q1_04 instance1 합계 적합', out, true),
  [],
);
await runAndVerify(
  'Q1_04 섬유 instance2(95+5=100)', C.FiberSumCheck, 'checkSum', fiberPub,
  new C.FiberPrivate({ p1: Field(950), p2: Field(50), p3: Field(0), p4: Field(0) }),
  (out) => checkBool('Q1_04 instance2 합계 적합', out, true),
  [],
);
await runAndVerify(
  'Q1_04 섬유 [합성](80+15+3=98, 허용오차 초과)', C.FiberSumCheck, 'checkSum', fiberPub,
  new C.FiberPrivate({ p1: Field(800), p2: Field(150), p3: Field(30), p4: Field(0) }),
  (out) => checkBool('Q1_04 [합성] 합계 미달', out, false),
  [],
);

// ---------------------------------------------------------------------------
// 4. Q3_10 OEKO-TEX pH (instance1: 6.4 적합, [합성] 8.5 미달)
// ---------------------------------------------------------------------------
const oekoPub = new C.OekotexPublic({ lowX10: Field(40), highX10: Field(75) });
await runAndVerify(
  'Q3_10 OEKO-TEX instance1(pH 6.4)', C.OekotexCheck, 'checkPh', oekoPub,
  new C.OekotexPrivate({ phX10: Field(64) }),
  (out) => checkBool('Q3_10 instance1 pH 적합', out, true),
  [64],
);
await runAndVerify(
  'Q3_10 OEKO-TEX [합성](pH 8.5)', C.OekotexCheck, 'checkPh', oekoPub,
  new C.OekotexPrivate({ phX10: Field(85) }),
  (out) => checkBool('Q3_10 [합성] pH 미달', out, false),
  [85],
);

// ---------------------------------------------------------------------------
// 5. Q2_07 배터리PCF instance1 (전 10건 동일 실측값: Co=12.0 미달, Li=6.0 경계 적합,
//    Ni=8.0 적합, Pb=0.0 적용제외, 용량 4.8kWh 조건부해당) - 전부 실제 mock 데이터
// ---------------------------------------------------------------------------
await runAndVerify(
  'Q2_07 배터리PCF instance1', C.BatteryCheck, 'checkAll',
  new C.BatteryPublic({ coThresholdX10: Field(160), liThresholdX10: Field(60),
    niThresholdX10: Field(60), pbThresholdX10: Field(850), capacityThresholdX10: Field(20) }),
  new C.BatteryPrivate({ coX10: Field(120), liX10: Field(60), niX10: Field(80),
    pbX10: Field(0), capacityX10: Field(48) }),
  (out) => {
    checkBool('Q2_07 Co(2031~)', out.coOk, false); // 실제 judge.py: 미달
    checkBool('Q2_07 Li(2031~)', out.liOk, true);  // 실제 judge.py: 적합(경계값 6.0==6.0)
    checkBool('Q2_07 Ni(2031~)', out.niOk, true);  // 실제 judge.py: 적합
    checkBool('Q2_07 Pb(2031~)', out.pbOkOrExempt, true); // 실제 judge.py: 적용제외
    checkBool('Q2_07 탄소발자국 선언의무 용량', out.capacityDeclarationFlag, true); // 실제 judge.py: 조건부 해당
  },
  [120,80,48],
);

// ---------------------------------------------------------------------------
// 6. Q4_15 재활용처리결과 instance1 (유일하게 완전한 데이터가 있는 건 - 실제 mock)
// ---------------------------------------------------------------------------
await runAndVerify(
  'Q4_15 재활용처리결과 instance1', C.RecyclingCheck, 'checkAll',
  new C.RecyclingPublic({ cuThresholdX10: Field(900), liThresholdX10: Field(500), coThresholdX10: Field(900) }),
  new C.RecyclingPrivate({ cuX10: Field(980), liDerivedX10: Field(800), coDerivedX10: Field(800) }),
  (out) => {
    checkBool('Q4_15 구리(2027~)', out.cuOk, true); // 실제 judge.py: 적합
    checkBool('Q4_15 리튬(2027~,파생)', out.liOk, true); // 실제 judge.py: 적합(가정 성립 시)
    checkBool('Q4_15 코발트(2027~,파생)', out.coOk, false); // 실제 judge.py: 미달(가정 성립 시)
  },
  [980,800],
);

// ---------------------------------------------------------------------------
// 7. Q2_04 RoHS instance1 (전부 적합 - 실제 mock) + [합성] Cd 초과 케이스
// ---------------------------------------------------------------------------
const rohsPub = new C.RohsPublic({ pbLimitX10: Field(10000), cdLimitX10: Field(1000),
  hgLimitX10: Field(10000), cr6LimitX10: Field(10000), pbbLimitX10: Field(10000), pbdeLimitX10: Field(10000) });
await runAndVerify(
  'Q2_04 RoHS instance1', C.RohsCheck, 'checkAll', rohsPub,
  new C.RohsPrivate({ pbX10: Field(2528), cdX10: Field(92), hgX10: Field(3134),
    cr6X10: Field(565), pbbX10: Field(2884), pbdeX10: Field(2670) }),
  (out) => {
    checkBool('Q2_04 Pb', out.pbOk, true);
    checkBool('Q2_04 Cd', out.cdOk, true);
    checkBool('Q2_04 Hg', out.hgOk, true);
    checkBool('Q2_04 Cr6+', out.cr6Ok, true);
    checkBool('Q2_04 PBB', out.pbbOk, true);
    checkBool('Q2_04 PBDE', out.pbdeOk, true);
  },
  [2528,92,3134,565,2884,2670],
);
await runAndVerify(
  'Q2_04 RoHS [합성](Cd=150.0mg/kg 초과)', C.RohsCheck, 'checkAll', rohsPub,
  new C.RohsPrivate({ pbX10: Field(2528), cdX10: Field(1500), hgX10: Field(3134),
    cr6X10: Field(565), pbbX10: Field(2884), pbdeX10: Field(2670) }),
  (out) => checkBool('Q2_04 [합성] Cd 미달', out.cdOk, false),
  [1500],
);

// ---------------------------------------------------------------------------
// 8. Q3_09 CE마킹 (instance1: 6.64mm 적합, [합성] 4.5mm 미달)
// ---------------------------------------------------------------------------
const cePub = new C.CeMarkingPublic({ minHeightX100: Field(500) });
await runAndVerify(
  'Q3_09 CE마킹 instance1(6.64mm)', C.CeMarkingCheck, 'checkHeight', cePub,
  new C.CeMarkingPrivate({ heightX100: Field(664) }),
  (out) => checkBool('Q3_09 instance1 높이 적합', out, true),
  [664],
);
await runAndVerify(
  'Q3_09 CE마킹 [합성](4.5mm)', C.CeMarkingCheck, 'checkHeight', cePub,
  new C.CeMarkingPrivate({ heightX100: Field(450) }),
  (out) => checkBool('Q3_09 [합성] 높이 미달', out, false),
  [450],
);

// ---------------------------------------------------------------------------
console.log('\n\n========== 최종 요약 ==========');
summary.forEach(s => console.log(s));
console.log(`\n${pass}개 통과 / ${fail}개 실패 (총 ${pass + fail}개 체크)`);
if (fail > 0) process.exitCode = 1;
