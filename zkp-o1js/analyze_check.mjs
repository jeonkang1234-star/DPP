// 가벼운 정적 검증: 각 회로의 제약조건 시스템만 빌드해서(신뢰설정/증명키 생성 없이)
// 타입 오류나 로직 오류가 없는지 빠르게 확인한다. 실제 증명 생성은 test_all.mjs에서.
import * as C from './circuits.mjs';

const programs = [
  ['SteelMillCheck', C.SteelMillCheck],
  ['CbamCheck', C.CbamCheck],
  ['FiberSumCheck', C.FiberSumCheck],
  ['OekotexCheck', C.OekotexCheck],
  ['BatteryCheck', C.BatteryCheck],
  ['RecyclingCheck', C.RecyclingCheck],
  ['RohsCheck', C.RohsCheck],
  ['CeMarkingCheck', C.CeMarkingCheck],
];

let allOk = true;
for (const [name, prog] of programs) {
  const t = Date.now();
  try {
    const result = await prog.analyzeMethods();
    console.log(`OK  ${name} - ${Date.now() - t}ms`);
    for (const [m, info] of Object.entries(result)) {
      console.log(`     ${m}: rows=${info.rows}`);
    }
  } catch (e) {
    allOk = false;
    console.log(`FAIL ${name} - ${e.message}`);
  }
}
console.log(allOk ? '\n전체 통과' : '\n일부 실패 - 위 로그 확인');
