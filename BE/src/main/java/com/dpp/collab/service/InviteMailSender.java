package com.dpp.collab.service;

/**
 * 협력사 초대 메일 발송 추상화. com.dpp.auth.service.SignupMailSender와 같은 패턴이지만
 * "인증코드" 전용 메서드라 그대로 재사용할 수 없어 별도 인터페이스로 둔다 - 실제 SMTP
 * 발송기(JavaMailSender) 자체는 같은 스프링 빈을 그대로 쓴다. 로컬 개발 기본값은
 * ConsoleInviteMailSender(콘솔 로그)이고, app.mail.enabled=true면 SmtpInviteMailSender가
 * 실제로 보낸다.
 *
 * 2026-08-21: 인자를 Invite 레코드로 묶었다. 예전엔 (수신자, 초대한 조직, 토큰) 셋뿐이라
 * 메일에 "어느 DPP의 무슨 자료를 요청하는지"를 쓸 수가 없었다 - 받는 쪽 입장에서 그게
 * 없으면 무슨 메일인지 알 수 없다(2026-08-21 강 요청).
 */
public interface InviteMailSender {

    /**
     * @param toEmail        받는 사람
     * @param inviterOrgName 초대한 조직명(제조사)
     * @param dppLabel       대상 DPP를 사람이 알아볼 이름(사용자 지정 이름 > 제품명 > DPP #id)
     * @param roleLabel      요청하는 자료의 종류("시험·인증기관 (시험성적서 ...)" 같은 문구)
     * @param token          초대 토큰. 수락 화면이 아직 없어 값 그대로 안내한다.
     * @param expiresInDays  유효기간(일)
     */
    record Invite(String toEmail, String inviterOrgName, String dppLabel,
                  String roleLabel, String token, int expiresInDays) {

        /** 메일 제목 - 콘솔/SMTP 발송기가 같은 문구를 쓰도록 여기 한 곳에 둔다. */
        public String subject() {
            return "[IEUM] " + inviterOrgName + "에서 " + dppLabel + " 자료 제출을 요청했습니다";
        }

        /** 메일 본문. 링크를 만들 수 없어(수락 화면 미구현) 토큰을 값 그대로 안내한다. */
        public String body() {
            return inviterOrgName + " 담당자가 IEUM 디지털 제품여권(DPP) 플랫폼에서\n"
                    + "귀사를 협력사로 초대했습니다.\n\n"
                    + "  대상 DPP   : " + dppLabel + "\n"
                    + "  요청 자료  : " + roleLabel + "\n"
                    + "  초대 코드  : " + token + "\n"
                    + "  유효 기간  : 발송일로부터 " + expiresInDays + "일\n\n"
                    + "IEUM에 가입한 뒤 '참여 DPP' 탭에서 요청받은 자료를 제출할 수 있습니다.\n"
                    + "이미 가입되어 있다면 로그인 후 바로 '참여 DPP' 탭에 표시됩니다.\n\n"
                    + "본 메일을 잘못 받으셨다면 회신 없이 삭제해 주세요.\n"
                    + "— IEUM Digital Product Passport";
        }
    }

    void sendInvite(Invite invite);
}
