package com.dpp.mypage.service;

import com.dpp.auth.entity.UserAccount;
import com.dpp.auth.entity.UserSnsLink;
import com.dpp.auth.repository.UserAccountRepository;
import com.dpp.auth.repository.UserSnsLinkRepository;
import com.dpp.mypage.dto.MeResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * REQ-MYPAGE: 로그인한 사용자 본인 정보 조회 (GET /me).
 * JwtAuthenticationFilter가 SecurityContext에 넣어준 principal(=UserAccount.userId 문자열)을
 * 그대로 받아서 조회한다.
 */
@Service
public class MeService {

    private final UserAccountRepository userAccountRepository;
    private final UserSnsLinkRepository userSnsLinkRepository;

    public MeService(UserAccountRepository userAccountRepository,
                      UserSnsLinkRepository userSnsLinkRepository) {
        this.userAccountRepository = userAccountRepository;
        this.userSnsLinkRepository = userSnsLinkRepository;
    }

    @Transactional(readOnly = true)
    public MeResponse getMe(Long userId) {
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "존재하지 않거나 삭제된 계정입니다."));

        List<UserSnsLink> snsLinks = userSnsLinkRepository.findByUserAccount_UserIdAndUnlinkedAtIsNull(userId);

        return MeResponse.of(user, snsLinks);
    }
}
