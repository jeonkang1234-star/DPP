package com.dpp.mypage.util;

/**
 * 국세청 사업자등록번호(10자리) 체크섬 검증 - 실제 국세청 진위확인 API가 내부적으로
 * 쓰는 것과 같은 공개된 검증 알고리즘이다(2026-08-16, 가입승인 자동화 작업).
 *
 * 국세청/EU VIES 실시간 조회 API 연동은 별도 계약·인증키가 필요해 이 프로토타입
 * 범위 밖이다 - 그 대신 형식이 유효한 국내(KR) 사업자등록번호는 이 체크섬만으로
 * 자동 승인하고, 그 외(형식 불일치 KR, 그리고 국내 밖 모든 국가)는 관리자 수동 심사로
 * 보낸다(OrganizationService.findOrCreateForSignup 참고). 나중에 실제 국세청 API
 * 자격을 받으면 isValid 자리에 실제 API 호출을 끼워넣으면 된다.
 */
public final class KoreanBizRegNoValidator {

    private static final int[] WEIGHTS = {1, 3, 7, 1, 3, 7, 1, 3, 5};

    private KoreanBizRegNoValidator() {
    }

    /** "000-00-00000" 같은 하이픈 포함 표기도 받아들인다 - 순수 숫자 10자리만 남겨서 검증. */
    public static boolean isValid(String bizRegNo) {
        if (bizRegNo == null) {
            return false;
        }
        String digits = bizRegNo.replaceAll("[^0-9]", "");
        if (digits.length() != 10) {
            return false;
        }
        int sum = 0;
        for (int i = 0; i < 9; i++) {
            sum += (digits.charAt(i) - '0') * WEIGHTS[i];
        }
        // 9번째 자리(index 8)는 5를 곱한 값을 10으로 나눈 몫을 한 번 더 더한다 - 국세청
        // 공개 알고리즘의 표준 보정 단계.
        sum += ((digits.charAt(8) - '0') * 5) / 10;
        int checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit == (digits.charAt(9) - '0');
    }
}
