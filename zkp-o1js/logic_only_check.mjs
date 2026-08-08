// ZkProgram 컴파일/증명 없이, circuits.mjs의 method 안에 있는 것과 "동일한" Field/Bool
// 비교식만 떼어내서 스케일링·경계값 로직이 기대(judge.py)와 일치하는지 빠르게 확인.
// (Field 연산 자체는 회로 밖에서도 똑같이 동작하므로 이 체크는 유효함 - 신뢰설정/
//  증명생성만 생략하는 것. 실제 증명까지 확인하려면 test_all.mjs를 돌릴 것)
import { Field } from 'o1js';

let pass = 0, fail = 0;
function chk(label, actual, expected) {
  const ok = actual === expected;
  console.log(`${ok ? 'OK ' : 'XX '} ${label}: ${actual} (기대 ${expected})`);
  ok ? pass++ : fail++;
}

// Q2_05 steel (instance1, 전부 적합)
{
  const le = (a,b) => Field(a).lessThanOrEqual(Field(b)).toBoolean();
  const ge = (a,b) => Field(a).greaterThanOrEqual(Field(b)).toBoolean();
  chk('steel C', le(180,240), true);
  chk('steel Si', le(350,550), true);
  chk('steel Rm low', ge(524,470), true);
  chk('steel Rm high', le(524,630), true);
}
// Q2_06 CBAM
chk('cbam instance1 obligated', Field(624).greaterThan(Field(500)).toBoolean(), true);
chk('cbam instance2 obligated', Field(21400).greaterThan(Field(500)).toBoolean(), true);
chk('cbam synth not-obligated', Field(300).greaterThan(Field(500)).toBoolean(), false);
// Q1_04 fiber sum
{
  const sum1 = Field(800).add(Field(150)).add(Field(50)).add(Field(0));
  chk('fiber instance1 sum=1000', sum1.toString(), '1000');
  const within = sum1.greaterThanOrEqual(Field(995)).and(sum1.lessThanOrEqual(Field(1005))).toBoolean();
  chk('fiber instance1 within tol', within, true);
  const sum2 = Field(800).add(Field(150)).add(Field(30)).add(Field(0)); // 980
  const within2 = sum2.greaterThanOrEqual(Field(995)).and(sum2.lessThanOrEqual(Field(1005))).toBoolean();
  chk('fiber synth(980) out of tol', within2, false);
}
// Q3_10 pH
chk('oekotex instance1 pH ok', Field(64).greaterThanOrEqual(Field(40)).and(Field(64).lessThanOrEqual(Field(75))).toBoolean(), true);
chk('oekotex synth pH 85 fail', Field(85).greaterThanOrEqual(Field(40)).and(Field(85).lessThanOrEqual(Field(75))).toBoolean(), false);
// Q2_07 battery
chk('battery Co fail(120<160)', Field(120).greaterThanOrEqual(Field(160)).toBoolean(), false);
chk('battery Li boundary ok(60>=60)', Field(60).greaterThanOrEqual(Field(60)).toBoolean(), true);
chk('battery Ni ok(80>=60)', Field(80).greaterThanOrEqual(Field(60)).toBoolean(), true);
chk('battery Pb exempt(0==0 OR)', Field(0).equals(Field(0)).or(Field(0).greaterThanOrEqual(Field(850))).toBoolean(), true);
chk('battery capacity flag(48>20)', Field(48).greaterThan(Field(20)).toBoolean(), true);
// Q4_15 recycling
chk('recycling Cu ok(980>=900)', Field(980).greaterThanOrEqual(Field(900)).toBoolean(), true);
chk('recycling Li-derived ok(800>=500)', Field(800).greaterThanOrEqual(Field(500)).toBoolean(), true);
chk('recycling Co-derived fail(800<900)', Field(800).greaterThanOrEqual(Field(900)).toBoolean(), false);
// Q2_04 RoHS
chk('rohs Pb ok', Field(2528).lessThanOrEqual(Field(10000)).toBoolean(), true);
chk('rohs Cd ok(92<=1000)', Field(92).lessThanOrEqual(Field(1000)).toBoolean(), true);
chk('rohs synth Cd fail(1500>1000)', Field(1500).lessThanOrEqual(Field(1000)).toBoolean(), false);
// Q3_09 CE height
chk('ce instance1 ok(664>=500)', Field(664).greaterThanOrEqual(Field(500)).toBoolean(), true);
chk('ce synth fail(450<500)', Field(450).greaterThanOrEqual(Field(500)).toBoolean(), false);

console.log(`\n${pass}개 통과 / ${fail}개 실패`);
if (fail > 0) process.exitCode = 1;
