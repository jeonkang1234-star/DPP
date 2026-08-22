package com.dpp.auth.dto;

/**
 * 이메일+비밀번호 로그인(/auth/login) 응답.
 * TokenResponse(SNS 로그인 응답)와 accessToken/refreshToken/tokenType은 같지만,
 * FE가 로그인 직후 화면 분기에 쓰는 accountType/email/displayName을 같이 내려주기 위해
 * 별도 DTO로 분리했다.
 *
 * appRole은 2026-08-22 강 리포트("세관 계정으로 가입했는데 로그인하면 철강제조사가 되어
 * 있다")로 추가했다. 그 전까지 FE는 mock 계정 매핑표에 없는 이메일이면 무조건 'steel'로
 * 착지시켰다 - 가입 화면에서 세관/시장감독기관을 골라도 로그인만 하면 제조사 화면이
 * 떴다는 뜻이다. 이제 organization.org_type/domain을 서버가 직접 화면 역할로 번역해서
 * 내려주고, FE는 그대로 쓴다(useAppLogic.doLogin).
 */
public record LoginResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        String accountType,
        String email,
        String displayName,
        /** organization.org_type 원본(MANUFACTURER/CUSTOMS/EU_AUTHORITY/...). 조직 없으면 null. */
        String orgType,
        /** organization.domain 원본(STEEL/BATTERY/TEXTILE). 기관 계정이나 조직 없으면 null. */
        String domain,
        /** FE 화면 역할: admin | personal | steel | battery | textile | customs | eu | partner. */
        String appRole
) {

    /**
     * 계정 종류 + 조직 유형/도메인을 FE 화면 역할 문자열로 번역한다.
     * 조직 유형을 알 수 없으면 null을 돌려주고, FE가 기존 휴리스틱으로 폴백한다 -
     * 여기서 섣불리 'steel'을 채우면 딱 이 버그가 되풀이된다.
     */
    public static String appRoleOf(String accountType, String orgType, String domain) {
        if ("ADMIN".equals(accountType)) {
            return "admin";
        }
        if ("PERSONAL".equals(accountType)) {
            return "personal";
        }
        if (orgType == null) {
            return null;
        }
        return switch (orgType) {
            case "CUSTOMS" -> "customs";
            case "EU_AUTHORITY" -> "eu";
            case "MANUFACTURER" -> switch (domain == null ? "" : domain) {
                case "BATTERY" -> "battery";
                case "TEXTILE" -> "textile";
                case "STEEL" -> "steel";
                default -> "steel";
            };
            case "RAW_SUPPLIER", "TEST_LAB", "RECYCLER", "LOGISTICS", "DISTRIBUTOR" -> "partner";
            default -> null;
        };
    }

    public static LoginResponse of(String accessToken, String refreshToken, String accountType,
                                    String email, String displayName,
                                    String orgType, String domain) {
        return new LoginResponse(accessToken, refreshToken, "bearer", accountType, email, displayName,
                orgType, domain, appRoleOf(accountType, orgType, domain));
    }
}
