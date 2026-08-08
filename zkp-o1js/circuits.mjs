// 8개 문서유형 x Boolean 출력형 ZKP 회로 (judge.py의 evaluate_* 경계와 1:1 대응)
//
// 설계 원칙:
// - 모든 회로는 "조건 충족 여부(Bool)"를 공개출력(publicOutput)으로 리턴한다.
//   즉 부적합(FAIL) 케이스도 정상적으로 증명이 생성된다 - 증명이 있다는 사실 자체가
//   "적합하다"는 뜻이 되는 assert형과 달리, 이 설계는 "이 비교 결과가 X(참/거짓)임을
//   증명한다"는 의미다. 실측값은 어느 경우에도 비공개(private input)로 남는다.
// - 화폐/비율 값은 정수 필드(Field) 연산만 가능하므로 고정소수점 스케일링을 쓴다:
//     · 철강 화학성분(wt%, 소수 3자리까지) -> x1000
//     · 철강 기계적성질(N/mm², %, J - 원본이 이미 정수)  -> x1 (스케일 없음)
//     · CBAM 수입량(t, 소수 1자리) / 배터리·재활용 비율(%, 소수 1자리) / pH(소수 1자리) -> x10
//     · CE마킹 높이(mm, 소수 2자리) -> x100
//     · RoHS 함량(mg/kg, 소수 1자리) -> x10
// - judge.py의 34개 항목 중 30개(단순 수치 임계값 비교로 환원 가능한 항목)만 회로화했다.
//   나머지 4개(CBAM 내재배출량/섬유명 Annex I 목록대조/배터리 생애주기 탄소발자국/
//   재활용효율 분모충돌)는 회로 설계상 단순 비교가 아니라서 이번 범위에서 제외 -
//   README.md "ZKP 비대상 4개 항목" 참고.

import { Field, Bool, Struct, ZkProgram } from 'o1js';

// ---------------------------------------------------------------------------
// 1. Q2_05 제강성적서 - 12항목 (화학성분 8 + 기계적성질 4, Rm은 상하한 2개 AND)
// ---------------------------------------------------------------------------
export class SteelLimits extends Struct({
  C: Field, Si: Field, Mn: Field, P: Field, S: Field, N: Field, Cu: Field, CEV: Field,
  ReH_min: Field, Rm_low: Field, Rm_high: Field, A_min: Field, KV_min: Field,
}) {}
export class SteelMeasured extends Struct({
  C: Field, Si: Field, Mn: Field, P: Field, S: Field, N: Field, Cu: Field, CEV: Field,
  ReH: Field, Rm: Field, A: Field, KV: Field,
}) {}
export class SteelVerdicts extends Struct({
  C: Bool, Si: Bool, Mn: Bool, P: Bool, S: Bool, N: Bool, Cu: Bool, CEV: Bool,
  ReH: Bool, Rm: Bool, A: Bool, KV: Bool,
}) {}

export const SteelMillCheck = ZkProgram({
  name: 'steel-mill-check',
  publicInput: SteelLimits,
  publicOutput: SteelVerdicts,
  methods: {
    checkAll: {
      privateInputs: [SteelMeasured],
      async method(limits, m) {
        return { publicOutput: new SteelVerdicts({
          C: m.C.lessThanOrEqual(limits.C),
          Si: m.Si.lessThanOrEqual(limits.Si),
          Mn: m.Mn.lessThanOrEqual(limits.Mn),
          P: m.P.lessThanOrEqual(limits.P),
          S: m.S.lessThanOrEqual(limits.S),
          N: m.N.lessThanOrEqual(limits.N),
          Cu: m.Cu.lessThanOrEqual(limits.Cu),
          CEV: m.CEV.lessThanOrEqual(limits.CEV),
          ReH: m.ReH.greaterThanOrEqual(limits.ReH_min),
          Rm: m.Rm.greaterThanOrEqual(limits.Rm_low).and(m.Rm.lessThanOrEqual(limits.Rm_high)),
          A: m.A.greaterThanOrEqual(limits.A_min),
          KV: m.KV.greaterThanOrEqual(limits.KV_min),
        })};
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 2. Q2_06 CBAM - 1항목 (연간누적 수입수량, de minimis 50t 초과 여부)
// ---------------------------------------------------------------------------
export class CbamPublic extends Struct({ deMinimisX10: Field }) {}
export class CbamPrivate extends Struct({ qtyX10: Field }) {}

export const CbamCheck = ZkProgram({
  name: 'cbam-check',
  publicInput: CbamPublic,
  publicOutput: Bool, // true = 의무 발생(de minimis 초과)
  methods: {
    checkObligation: {
      privateInputs: [CbamPrivate],
      async method(pub, priv) {
        return { publicOutput: priv.qtyX10.greaterThan(pub.deMinimisX10) };
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 3. Q1_04 섬유케어라벨 - 1항목 (혼용률 합계 ≈100%, 최대 4개 섬유 슬롯 패딩)
// ---------------------------------------------------------------------------
export class FiberPublic extends Struct({ targetX10: Field, toleranceX10: Field }) {}
export class FiberPrivate extends Struct({ p1: Field, p2: Field, p3: Field, p4: Field }) {}

export const FiberSumCheck = ZkProgram({
  name: 'fiber-sum-check',
  publicInput: FiberPublic,
  publicOutput: Bool,
  methods: {
    checkSum: {
      privateInputs: [FiberPrivate],
      async method(pub, priv) {
        const sum = priv.p1.add(priv.p2).add(priv.p3).add(priv.p4);
        const low = pub.targetX10.sub(pub.toleranceX10);
        const high = pub.targetX10.add(pub.toleranceX10);
        return { publicOutput: sum.greaterThanOrEqual(low).and(sum.lessThanOrEqual(high)) };
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 4. Q3_10 OEKO-TEX - 1항목 (pH 4.0~7.5)
// ---------------------------------------------------------------------------
export class OekotexPublic extends Struct({ lowX10: Field, highX10: Field }) {}
export class OekotexPrivate extends Struct({ phX10: Field }) {}

export const OekotexCheck = ZkProgram({
  name: 'oekotex-check',
  publicInput: OekotexPublic,
  publicOutput: Bool,
  methods: {
    checkPh: {
      privateInputs: [OekotexPrivate],
      async method(pub, priv) {
        return { publicOutput: priv.phX10.greaterThanOrEqual(pub.lowX10).and(priv.phX10.lessThanOrEqual(pub.highX10)) };
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 5. Q2_07 배터리PCF - 5항목 (재생원료 Co/Li/Ni/Pb + 탄소발자국 선언의무 용량플래그)
//    Pb는 "실측 0% -> 적용제외" 예외를 OR로 흡수: (0%다) OR (기준치 이상이다)
// ---------------------------------------------------------------------------
export class BatteryPublic extends Struct({
  coThresholdX10: Field, liThresholdX10: Field, niThresholdX10: Field,
  pbThresholdX10: Field, capacityThresholdX10: Field,
}) {}
export class BatteryPrivate extends Struct({
  coX10: Field, liX10: Field, niX10: Field, pbX10: Field, capacityX10: Field,
}) {}
export class BatteryVerdicts extends Struct({
  coOk: Bool, liOk: Bool, niOk: Bool, pbOkOrExempt: Bool, capacityDeclarationFlag: Bool,
}) {}

export const BatteryCheck = ZkProgram({
  name: 'battery-check',
  publicInput: BatteryPublic,
  publicOutput: BatteryVerdicts,
  methods: {
    checkAll: {
      privateInputs: [BatteryPrivate],
      async method(pub, priv) {
        return { publicOutput: new BatteryVerdicts({
          coOk: priv.coX10.greaterThanOrEqual(pub.coThresholdX10),
          liOk: priv.liX10.greaterThanOrEqual(pub.liThresholdX10),
          niOk: priv.niX10.greaterThanOrEqual(pub.niThresholdX10),
          pbOkOrExempt: priv.pbX10.equals(Field(0)).or(priv.pbX10.greaterThanOrEqual(pub.pbThresholdX10)),
          capacityDeclarationFlag: priv.capacityX10.greaterThan(pub.capacityThresholdX10),
        })};
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 6. Q4_15 재활용처리결과 - 3항목 (구리 직접 + 리튬/코발트 파생(LiCoO2 가정))
// ---------------------------------------------------------------------------
export class RecyclingPublic extends Struct({
  cuThresholdX10: Field, liThresholdX10: Field, coThresholdX10: Field,
}) {}
export class RecyclingPrivate extends Struct({
  cuX10: Field, liDerivedX10: Field, coDerivedX10: Field,
}) {}
export class RecyclingVerdicts extends Struct({ cuOk: Bool, liOk: Bool, coOk: Bool }) {}

export const RecyclingCheck = ZkProgram({
  name: 'recycling-check',
  publicInput: RecyclingPublic,
  publicOutput: RecyclingVerdicts,
  methods: {
    checkAll: {
      privateInputs: [RecyclingPrivate],
      async method(pub, priv) {
        return { publicOutput: new RecyclingVerdicts({
          cuOk: priv.cuX10.greaterThanOrEqual(pub.cuThresholdX10),
          liOk: priv.liDerivedX10.greaterThanOrEqual(pub.liThresholdX10),
          coOk: priv.coDerivedX10.greaterThanOrEqual(pub.coThresholdX10),
        })};
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 7. Q2_04 RoHS - 6항목 (Pb/Cd/Hg/Cr6+/PBB/PBDE, mg/kg 기준 이하)
// ---------------------------------------------------------------------------
export class RohsPublic extends Struct({
  pbLimitX10: Field, cdLimitX10: Field, hgLimitX10: Field,
  cr6LimitX10: Field, pbbLimitX10: Field, pbdeLimitX10: Field,
}) {}
export class RohsPrivate extends Struct({
  pbX10: Field, cdX10: Field, hgX10: Field, cr6X10: Field, pbbX10: Field, pbdeX10: Field,
}) {}
export class RohsVerdicts extends Struct({
  pbOk: Bool, cdOk: Bool, hgOk: Bool, cr6Ok: Bool, pbbOk: Bool, pbdeOk: Bool,
}) {}

export const RohsCheck = ZkProgram({
  name: 'rohs-check',
  publicInput: RohsPublic,
  publicOutput: RohsVerdicts,
  methods: {
    checkAll: {
      privateInputs: [RohsPrivate],
      async method(pub, priv) {
        return { publicOutput: new RohsVerdicts({
          pbOk: priv.pbX10.lessThanOrEqual(pub.pbLimitX10),
          cdOk: priv.cdX10.lessThanOrEqual(pub.cdLimitX10),
          hgOk: priv.hgX10.lessThanOrEqual(pub.hgLimitX10),
          cr6Ok: priv.cr6X10.lessThanOrEqual(pub.cr6LimitX10),
          pbbOk: priv.pbbX10.lessThanOrEqual(pub.pbbLimitX10),
          pbdeOk: priv.pbdeX10.lessThanOrEqual(pub.pbdeLimitX10),
        })};
      },
    },
  },
});

// ---------------------------------------------------------------------------
// 8. Q3_09 CE마킹 - 1항목 (최소 높이 5mm 이상)
// ---------------------------------------------------------------------------
export class CeMarkingPublic extends Struct({ minHeightX100: Field }) {}
export class CeMarkingPrivate extends Struct({ heightX100: Field }) {}

export const CeMarkingCheck = ZkProgram({
  name: 'ce-marking-check',
  publicInput: CeMarkingPublic,
  publicOutput: Bool,
  methods: {
    checkHeight: {
      privateInputs: [CeMarkingPrivate],
      async method(pub, priv) {
        return { publicOutput: priv.heightX100.greaterThanOrEqual(pub.minHeightX100) };
      },
    },
  },
});
