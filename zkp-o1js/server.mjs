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
import { SteelMillCheck, SteelLimits, SteelMeasured } from './circuits.mjs';

const PORT = process.env.PORT || 4001;

console.log('SteelMillCheck 컴파일 중... (서버 기동 시 1회, 약 10~15초)');
const t0 = Date.now();
const { verificationKey } = await SteelMillCheck.compile();
console.log(`컴파일 완료: ${Date.now() - t0}ms`);

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
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

// 증명 생성이 오래 걸리므로(수십 초) 서버 타임아웃을 넉넉히 잡는다.
server.timeout = 5 * 60 * 1000;

server.listen(PORT, () => {
  console.log(`zkp-o1js HTTP 서버 기동: http://0.0.0.0:${PORT}`);
});
