package com.dpp.mypage.dto;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.entity.UserSnsLink;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * GET /me 응답. 로그인한 사용자 본인의 실제 이름/이메일/연결계정.
 * userId는 UserAccount.userId(내부 시퀀스 PK)가 아니라 publicUuid를 문자열로 내려준다 -
 * JWT subject/DB PK를 그대로 외부에 노출하지 않기 위함.
 */
public record MeResponse(
        String id,
        String accountType,
        String email,
        boolean emailVerified,
        String displayName,
        String phone,
        boolean phoneVerified,
        String onboardingStep,
        List<ConnectedAccount> connectedAccounts
) {

    public record ConnectedAccount(
            String provider,
            String email,
            String nickname,
            boolean primary,
            OffsetDateTime linkedAt
    ) {
        public static ConnectedAccount from(UserSnsLink link) {
            return new ConnectedAccount(
                    link.getProvider().name(),
                    link.getProviderEmail(),
                    link.getProviderNickname(),
                    link.isPrimary(),
                    link.getLinkedAt());
        }
    }

    public static MeResponse of(UserAccount user, List<UserSnsLink> snsLinks) {
        return new MeResponse(
                user.getPublicUuid().toString(),
                user.getAccountType().name(),
                user.getEmail(),
                user.isEmailVerified(),
                user.getDisplayName(),
                user.getPhone(),
                user.isPhoneVerified(),
                user.getOnboardingStep().name(),
                snsLinks.stream().map(ConnectedAccount::from).toList()
        );
    }
}
