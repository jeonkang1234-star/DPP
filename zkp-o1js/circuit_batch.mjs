import { Field, Struct, ZkProgram, verify } from 'o1js';
import { writeFileSync } from 'fs';

// 제강성적서(Q2_05) 12개 항목을 회로 하나로 묶기.
// wt% 화학성분은 x1000 스케일(0.18wt% -> 180), 기계적성질(N/mm²,%,J)은 이미 정수라 그대로.
class SteelLimits extends Struct({
  C: Field, Si: Field, Mn: Field, P: Field, S: Field, N: Field, Cu: Field, CEV: Field,
  ReH_min: Field, Rm_low: Field, Rm_high: Field, A_min: Field, KV_min: Field,
}) {}

class SteelMeasured extends Struct({
  C: Field, Si: Field, Mn: Field, P: Field, S: Field, N: Field, Cu: Field, CEV: Field,
  ReH: Field, Rm: Field, A: Field, KV: Field,
}) {}

const SteelMillCheck = ZkProgram({
  name: 'steel-mill-check',
  publicInput: SteelLimits,
  publicOutput: Field, // 1 = 12개 항목 전부 적합
  methods: {
    proveAllPass: {
      privateInputs: [SteelMeasured],
      async method(limits, m) {
        m.C.assertLessThanOrEqual(limits.C, 'C 초과');
        m.Si.assertLessThanOrEqual(limits.Si, 'Si 초과');
        m.Mn.assertLessThanOrEqual(limits.Mn, 'Mn 초과');
        m.P.assertLessThanOrEqual(limits.P, 'P 초과');
        m.S.assertLessThanOrEqual(limits.S, 'S 초과');
        m.N.assertLessThanOrEqual(limits.N, 'N 초과');
        m.Cu.assertLessThanOrEqual(limits.Cu, 'Cu 초과');
        m.CEV.assertLessThanOrEqual(limits.CEV, 'CEV 초과');
        m.ReH.assertGreaterThanOrEqual(limits.ReH_min, 'ReH 미달');
        m.Rm.assertGreaterThanOrEqual(limits.Rm_low, 'Rm 미달(하한)');
        m.Rm.assertLessThanOrEqual(limits.Rm_high, 'Rm 초과(상한)');
        m.A.assertGreaterThanOrEqual(limits.A_min, 'A 미달');
        m.KV.assertGreaterThanOrEqual(limits.KV_min, 'KV 미달');
        return { publicOutput: Field(1) };
      },
    },
  },
});

// 실제 instance-1 값 (judge.py로 검증됐던 그 값들, wt%는 x1000)
const limits = new SteelLimits({
  C: Field(240), Si: Field(550), Mn: Field(1600), P: Field(35), S: Field(35),
  N: Field(12), Cu: Field(550), CEV: Field(470),
  ReH_min: Field(355), Rm_low: Field(470), Rm_high: Field(630), A_min: Field(22), KV_min: Field(27),
});
const measured = new SteelMeasured({
  C: Field(180), Si: Field(350), Mn: Field(1400), P: Field(18), S: Field(12),
  N: Field(8), Cu: Field(220), CEV: Field(420),
  ReH: Field(382), Rm: Field(524), A: Field(26), KV: Field(48),
});

console.log('compiling (12항목 통합 회로)...');
let t = Date.now();
const { verificationKey } = await SteelMillCheck.compile();
console.log(`  완료 ${Date.now() - t}ms`);

console.log('proving (12항목 전부 한 번에)...');
t = Date.now();
const { proof } = await SteelMillCheck.proveAllPass(limits, measured);
const proveMs = Date.now() - t;
console.log(`  완료 ${proveMs}ms (단일항목 회로는 ~105000ms였음 -> ${(105000/proveMs).toFixed(1)}배 효율)`);

const proofJson = JSON.stringify(proof.toJSON());
console.log('실측값(180,350,1400...)이 증명 데이터에 노출되는가?',
  [180,350,1400,18,12,8,220,420,382,524,26,48].some(v => proofJson.includes(`"${v}"`)));
console.log('증명 데이터 크기:', proofJson.length, 'byte');
writeFileSync('proof_output.json', proofJson);
console.log('proof_output.json 저장됨 - 열어서 180, 0.18 같은 원본 측정값이 안 보이는지 확인 가능');

console.log('verifying...');
t = Date.now();
const ok = await verify(proof, verificationKey);
console.log(`  완료 ${Date.now() - t}ms -> 결과:`, ok);

console.log('\n반례: C를 300(기준 240 초과)으로 바꿔서 증명 시도...');
const badMeasured = new SteelMeasured({ ...measured, C: Field(300) });
try {
  await SteelMillCheck.proveAllPass(limits, badMeasured);
  console.log('!!버그: 생성되면 안 되는데 생성됨');
} catch (e) {
  console.log('예상대로 거부됨:', e.message.split('\n')[0]);
}
