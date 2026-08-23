package com.dpp.auth.repository;

import com.dpp.auth.entity.AccountType;
import com.dpp.auth.entity.UserAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, Long> {

    Optional<UserAccount> findByLoginId(String loginId);

    /**
     * 탈퇴/삭제된 계정(deleted_at)은 제외한다(2026-08-23).
     *
     * 예전엔 deleted_at을 보지 않아서 두 가지 문제가 있었다.
     *   1) 소프트 삭제된 계정으로 그대로 로그인이 됐다(PasswordAuthService) - 보안 문제다.
     *   2) 협력사 초대 검증이 이미 삭제된 계정을 "등록된 이메일"로 인정했다.
     * user_account의 유니크 인덱스도 `WHERE deleted_at IS NULL` 부분 인덱스라, 삭제된
     * 행을 무시하는 쪽이 스키마 의도와도 일치한다.
     */
    Optional<UserAccount> findByEmailAndDeletedAtIsNull(String email);

    Optional<UserAccount> findByCiValue(String ciValue);

    boolean existsByLoginId(String loginId);

    /**
     * 기업 회원가입 시 이메일 중복 체크용 (BusinessSignupService).
     *
     * deleted_at을 보는 이유(2026-08-23): 예전엔 소프트 삭제된 계정도 "이미 가입된
     * 이메일입니다"로 재가입을 막았다. 그러면 계정을 지워도 같은 이메일로 다시 가입할 수
     * 없어서 소프트 삭제가 사실상 무의미해진다 - ux_user_email 인덱스가 이미
     * `WHERE deleted_at IS NULL` 부분 인덱스라 DB 제약과도 어긋났다.
     */
    boolean existsByEmailAndDeletedAtIsNull(String email);

    /** 협력사 제출 완료 알림 등 - 소유 조직에 속한 모든 계정에게 알려야 할 때 사용. */
    List<UserAccount> findByOrgId(Long orgId);

    /** 운영자 전원 - 새 가입 신청처럼 관리자에게 알려야 할 때 사용(2026-08-22 강 요청). */
    List<UserAccount> findByAccountType(AccountType accountType);
}
