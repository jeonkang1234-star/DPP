// zkp-o1js를 HTTP로 감싼 최소 서버. Spring Boot BE(com.dpp.document)가 문서 파싱 결과를
// 받은 뒤 이 서버에 증명을 요청한다.
//
// SteelMillCheck 하나만 우선 노출한다(Q2_05 제강성적서, 첫 연동 대상). circuits.mjs에
// 있는 나머지 7개 회로도 같은 패턴으로 추가하면 된다.
//
// compile()은 서버 기동 시 1회만 실행하고(약 14초, verificationKey는 고정) 캐싱한다 -
// 요청마다 다시 컴파일하면 매번 그 비용이 붙어서 비효율적이다. prove()만 요청마다 실행한다
// (약 30~60초 - 실제 zk-SNARK 증명 생성이라 원래 무겁다. 호출하는 쪽(BE)의 타임아웃을
// 충분히 길게(예: 3분) 잡아야 한다).
//
// 측정값(private input)은 응답에 절대 포함하지 않는다 - verdicts(참/거짓)와 proof만 반환.

import http from 'node:http';
import { Field, verify } from 'o1js';
import {
  SteelMillCheck, SteelLimits, SteelMeasured,
  CbamCheck, CbamPublic, CbamPrivate,
  FiberSumCheck, FiberPublic, FiberPrivate,
  OekotexCheck, OekotexPublic, OekotexPrivate,
  BatteryCheck, BatteryPublic, BatteryPrivate,
  RecyclingCheck, RecyclingPublic, RecyclingPrivate,
} from './circuits.mjs';

const PORT = process.env.PORT || 4001;

console.log('SteelMillCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0 = Date.now();
const { verificationKey } = await SteelMillCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0}ms`);

// CBAM(Q2_06) 회로도 같은 서버에서 같이 노출한다 - 별도 프로세스로 안 쪼갠 이유는 o1js
// 컴파일 비용(회로당 약 10~15초)이 서버 기동 시 1회뿐이라 굳이 나눌 필요가 없어서다.
console.log('CbamCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0b = Date.now();
const { verificationKey: cbamVerificationKey } = await CbamCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0b}ms`);

// 섬유(TEXTILE) 도메인 - Q1_04 섬유케어라벨(FiberSumCheck)/Q3_10 OEKO-TEX(OekotexCheck).
// 철강(SteelMillCheck)/CBAM(CbamCheck)과 같은 이유로 같은 서버 프로세스에서 같이 컴파일한다.
console.log('FiberSumCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0c = Date.now();
const { verificationKey: fiberVerificationKey } = await FiberSumCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0c}ms`);

console.log('OekotexCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0d = Date.now();
const { verificationKey: oekotexVerificationKey } = await OekotexCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0d}ms`);

// 배터리(BATTERY) 도메인 - Q2_07 배터리 탄소발자국 선언(BatteryCheck)/Q4_15 재활용 처리
// 결과 보고서(RecyclingCheck). 위 4개 회로와 같은 이유로 같은 서버 프로세스에서 같이
// 컴파일한다(2026-08-16).
console.log('BatteryCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0e = Date.now();
const { verificationKey: batteryVerificationKey } = await BatteryCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0e}ms`);

console.log('RecyclingCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0f = Date.now();
const { verificationKey: recyclingVerificationKey } = await RecyclingCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0f}ms`);

function toFields(obj, keys) {
  const out = {};
  for (const k of keys) {
    const v = obj[k];
    if (v === undefined || v === null || !Number.isFinite(Number(v))) {
      throw new Error(`필수 값 누락 또는 숫자가 아님: ${k}`);
    }
    out[k] = Field(Math.trunc(Number(v)));
  }
  return out;
}

const LIMIT_KEYS = ['C', 'Si', 'Mn', 'P', 'S', 'N', 'Cu', 'CEV', 'ReH_min', 'Rm_low', 'Rm_high', 'A_min', 'KV_min'];
const MEASURED_KEYS = ['C', 'Si', 'Mn', 'P', 'S', 'N', 'Cu', 'CEV', 'ReH', 'Rm', 'A', 'KV'];

async function handleSteelMillCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const limits = new SteelLimits(toFields(payload.limits || {}, LIMIT_KEYS));
    const measured = new SteelMeasured(toFields(payload.measured || {}, MEASURED_KEYS));

    const t1 = Date.now();
    const { proof } = await SteelMillCheck.checkAll(limits, measured);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, verificationKey);
    const verifyMs = Date.now() - t2;

    const out = proof.publicOutput;
    const verdicts = {};
    for (const k of MEASURED_KEYS) verdicts[k] = out[k].toBoolean();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      verdicts,
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

// CBAM(Q2_06) - "연간 누적 수입수량이 de minimis(50t) 기준을 초과했는가"만 증명한다.
// 이게 스틸밀체크와 다른 점: 출력(publicOutput)이 "적합/부적합"이 아니라 "의무 발생
// 여부(둘 다 정상적인 결과)"라서, verdicts를 review_status(승인/반려)에 매핑하면 안 된다 -
// 파서가 값을 못 읽거나 크립토 검증 자체가 실패한 경우에만 처리 실패로 본다. 실제
// 의무 발생 여부(obligated)는 CBAM_APPLICABLE 필드에 자동 반영하는 용도로만 쓴다
// (Java쪽 CbamIngestService 참고).
async function handleCbamCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const deMinimisX10 = payload.deMinimisX10;
    const qtyX10 = payload.qtyX10;
    if (!Number.isFinite(Number(deMinimisX10)) || !Number.isFinite(Number(qtyX10))) {
      throw new Error('deMinimisX10/qtyX10이 숫자가 아닙니다.');
    }

    const pub = new CbamPublic({ deMinimisX10: Field(Math.trunc(Number(deMinimisX10))) });
    const priv = new CbamPrivate({ qtyX10: Field(Math.trunc(Number(qtyX10))) });

    const t1 = Date.now();
    const { proof } = await CbamCheck.checkObligation(pub, priv);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, cbamVerificationKey);
    const verifyMs = Date.now() - t2;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      obligated: proof.publicOutput.toBoolean(),
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

// 섬유(Q1_04) - 섬유 혼용률 합계가 목표치(100%) 허용오차 이내인지만 증명한다(개별 섬유명은
// 비공개, Annex I 명칭 유효성은 회로화 대상 아님 - README "ZKP 비대상 4개 항목" 참고).
// Java쪽(FiberZkpMapper)이 임의 개수의 섬유 조성 항목을 p1(=합계)에 몰아넣고 p2~p4는 0으로
// 채워 보낸다 - 회로는 4개를 그냥 합산만 하므로 이렇게 해도 "혼용률 합계" 자체는 정확하다.
async function handleFiberSumCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const pub = new FiberPublic({
      targetX10: Field(Math.trunc(Number(payload.targetX10))),
      toleranceX10: Field(Math.trunc(Number(payload.toleranceX10))),
    });
    const priv = new FiberPrivate({
      p1: Field(Math.trunc(Number(payload.p1 ?? 0))),
      p2: Field(Math.trunc(Number(payload.p2 ?? 0))),
      p3: Field(Math.trunc(Number(payload.p3 ?? 0))),
      p4: Field(Math.trunc(Number(payload.p4 ?? 0))),
    });

    const t1 = Date.now();
    const { proof } = await FiberSumCheck.checkSum(pub, priv);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, fiberVerificationKey);
    const verifyMs = Date.now() - t2;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      passed: proof.publicOutput.toBoolean(),
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

// OEKO-TEX(Q3_10) - pH 실측값이 [low, high] 범위 안인지만 증명한다.
async function handleOekotexCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const pub = new OekotexPublic({
      lowX10: Field(Math.trunc(Number(payload.lowX10))),
      highX10: Field(Math.trunc(Number(payload.highX10))),
    });
    const priv = new OekotexPrivate({ phX10: Field(Math.trunc(Number(payload.phX10))) });

    const t1 = Date.now();
    const { proof } = await OekotexCheck.checkPh(pub, priv);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, oekotexVerificationKey);
    const verifyMs = Date.now() - t2;

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      passed: proof.publicOutput.toBoolean(),
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

// 배터리(Q2_07) - 재생원료 4원소(Co/Li/Ni/Pb) 임계값 충족 여부 + 탄소발자국 선언의무 용량
// 플래그(정보성, pass/fail 아님) 5항목을 한 번에 증명한다. SteelMillCheck처럼 여러 항목을
// 각각 Bool로 돌려주는 구조 - capacityDeclarationFlag는 CbamCheck의 obligated와 같은 성격
// (정보 플래그일 뿐, 규격 적합 여부 판정에는 안 쓴다 - Java쪽 BatteryIngestService 참고).
async function handleBatteryCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const pub = new BatteryPublic({
      coThresholdX10: Field(Math.trunc(Number(payload.coThresholdX10))),
      liThresholdX10: Field(Math.trunc(Number(payload.liThresholdX10))),
      niThresholdX10: Field(Math.trunc(Number(payload.niThresholdX10))),
      pbThresholdX10: Field(Math.trunc(Number(payload.pbThresholdX10))),
      capacityThresholdX10: Field(Math.trunc(Number(payload.capacityThresholdX10))),
    });
    const priv = new BatteryPrivate({
      coX10: Field(Math.trunc(Number(payload.coX10))),
      liX10: Field(Math.trunc(Number(payload.liX10))),
      niX10: Field(Math.trunc(Number(payload.niX10))),
      pbX10: Field(Math.trunc(Number(payload.pbX10))),
      capacityX10: Field(Math.trunc(Number(payload.capacityX10))),
    });

    const t1 = Date.now();
    const { proof } = await BatteryCheck.checkAll(pub, priv);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, batteryVerificationKey);
    const verifyMs = Date.now() - t2;

    const out = proof.publicOutput;
    const verdicts = {
      coOk: out.coOk.toBoolean(),
      liOk: out.liOk.toBoolean(),
      niOk: out.niOk.toBoolean(),
      pbOkOrExempt: out.pbOkOrExempt.toBoolean(),
      capacityDeclarationFlag: out.capacityDeclarationFlag.toBoolean(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      verdicts,
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

// 재활용 처리결과(Q4_15) - 구리(직접) + 리튬/코발트(리튬코발트산화물 화합물 파생) 물질회수율
// 3항목이 각각 기준치를 넘는지 증명한다. 종합재활용효율(judge.py의 "재활용효율(2025~)")은
// 회로 대상이 아니다(단순 임계값 비교가 아니라 분모 정합성 검증까지 포함해서 - README
// "ZKP 비대상 4개 항목" 참고) - Java쪽에서 파싱값을 그대로 정보성 필드로만 반영한다.
async function handleRecyclingCheck(req, res) {
  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: '잘못된 JSON입니다.' }));
    return;
  }

  try {
    const pub = new RecyclingPublic({
      cuThresholdX10: Field(Math.trunc(Number(payload.cuThresholdX10))),
      liThresholdX10: Field(Math.trunc(Number(payload.liThresholdX10))),
      coThresholdX10: Field(Math.trunc(Number(payload.coThresholdX10))),
    });
    const priv = new RecyclingPrivate({
      cuX10: Field(Math.trunc(Number(payload.cuX10))),
      liDerivedX10: Field(Math.trunc(Number(payload.liDerivedX10))),
      coDerivedX10: Field(Math.trunc(Number(payload.coDerivedX10))),
    });

    const t1 = Date.now();
    const { proof } = await RecyclingCheck.checkAll(pub, priv);
    const proveMs = Date.now() - t1;

    const t2 = Date.now();
    const verified = await verify(proof, recyclingVerificationKey);
    const verifyMs = Date.now() - t2;

    const out = proof.publicOutput;
    const verdicts = {
      cuOk: out.cuOk.toBoolean(),
      liOk: out.liOk.toBoolean(),
      coOk: out.coOk.toBoolean(),
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      verified,
      verdicts,
      proveMs,
      verifyMs,
      proof: proof.toJSON(),
    }));
  } catch (err) {
    console.error(err);
    res.writeHead(422, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err.message || err) }));
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/steel-mill-check') {
    await handleSteelMillCheck(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/cbam-check') {
    await handleCbamCheck(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/fiber-sum-check') {
    await handleFiberSumCheck(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/oekotex-check') {
    await handleOekotexCheck(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/battery-check') {
    await handleBatteryCheck(req, res);
    return;
  }
  if (req.method === 'POST' && req.url === '/prove/recycling-check') {
    await handleRecyclingCheck(req, res);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

// 증명 생성이 오래 걸리므로(수십 초) 서버 타임아웃을 넉넉히 잡는다.
server.timeout = 5 * 60 * 1000;

server.listen(PORT, () => {
  console.log(`zkp-o1js HTTP 서버 기동: http://0.0.0.0:${PORT}`);
});
