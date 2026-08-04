pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

// 재생함량 인증서 [Q2_08] 용 ZKP 회로.
// 실제 재활용함량 %(actualPercentX10)는 절대 공개하지 않고,
// "임계치(threshold) 이상이다" 라는 사실만 증명한다.
//
// 파서가 뽑는 실제 값이 소수점 한 자리까지 있어서(예: 19.5%, 100.0%),
// 정수 필드만 다루는 회로 특성상 x10 고정소수점으로 넣는다.
// 즉 19.5% -> 195, 100.0% -> 1000 로 변환해서 입력한다 (threshold도 동일하게 x10).
//
// - actualPercentX10 : private input  (예: 195 = 19.5%)  -- 증명자만 아는 값, 증명에 노출 안 됨
// - thresholdX10      : public input  (예: 300 = 30.0%)  -- 온체인 recordZkpVerification의 publicInputsJson과 매칭
// - isAboveThreshold  : public output -- 회로 제약으로 반드시 1이어야만 증명 생성이 성공함
//
// 즉 "증명이 생성/검증됨 = actualPercentX10 >= thresholdX10가 참"이라는 뜻이고,
// actualPercentX10 자체는 증명/공개 입력 어디에도 나타나지 않는다.
template RecycledContentThreshold(bits) {
    signal input actualPercentX10;   // private
    signal input thresholdX10;       // public

    signal output isAboveThreshold;

    component geq = GreaterEqThan(bits);
    geq.in[0] <== actualPercentX10;
    geq.in[1] <== thresholdX10;

    isAboveThreshold <== geq.out;

    // 이 제약 때문에 actualPercentX10 < thresholdX10이면 증명 생성 자체가 실패한다.
    // (거짓 주장에 대해 증명을 만들 수 없음)
    isAboveThreshold === 1;
}

// bits=10 -> 0~1023 범위 비교 가능 (x10 고정소수점으로 0~100.0% 전부 커버, 100.0%=1000)
component main {public [thresholdX10]} = RecycledContentThreshold(10);
