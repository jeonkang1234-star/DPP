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
     * 실제로 메일이 나가는 발송기인가. 콘솔 발송기는 false - 로그만 찍고 성공한 것처럼
     * 끝나서, 서버에 메일 설정이 없으면(EC2에 docker/.env 메일 값 미설정 등) 화면에는
     * "발송했습니다"가 뜨는데 실제로는 아무 메일도 안 가는 상태였다(2026-10-01 강 리포트).
     */
    default boolean delivers() {
        return true;
    }

    /**
     * @param toEmail        받는 사람
     * @param inviterOrgName 초대한 조직명(제조사)
     * @param dppLabel       대상 DPP를 사람이 알아볼 이름(사용자 지정 이름 > 제품명 > DPP #id)
     * @param roleLabel      요청하는 자료의 종류("시험·인증기관 (시험성적서 ...)" 같은 문구)
     * @param token          초대 토큰
     * @param expiresInDays  유효기간(일)
     * @param link           초대 링크(/invite/{token}) - 누르면 초대 안내 화면에서 로그인 후
     *                       해당 DPP로 바로 이동한다(2026-10-04 강 요청). null이면 링크 없이 안내.
     */
    record Invite(String toEmail, String inviterOrgName, String dppLabel,
                  String roleLabel, String token, int expiresInDays, String link) {

        /** 메일 제목 - 콘솔/SMTP 발송기가 같은 문구를 쓰도록 여기 한 곳에 둔다. */
        public String subject() {
            return "[IEUM] " + inviterOrgName + "에서 " + dppLabel + " 자료 제출을 요청했습니다";
        }

        /** 메일 본문(텍스트). HTML을 못 보는 메일 앱용이자 콘솔 발송기 출력. */
        public String body() {
            return inviterOrgName + " 담당자가 IEUM 디지털 제품여권(DPP) 플랫폼에서\n"
                    + "귀사를 협력사로 초대했습니다.\n\n"
                    + "  대상 DPP   : " + dppLabel + "\n"
                    + "  요청 자료  : " + roleLabel + "\n"
                    + "  유효 기간  : 발송일로부터 " + expiresInDays + "일\n\n"
                    + (link != null
                        ? "아래 링크를 누르면 로그인 후 해당 DPP 자료 제출 화면으로 바로 이동합니다.\n"
                          + "  " + link + "\n\n"
                        : "IEUM에 로그인한 뒤 '참여 DPP' 탭에서 요청받은 자료를 제출할 수 있습니다.\n"
                          + "  초대 코드  : " + token + "\n\n")
                    + "본 메일을 잘못 받으셨다면 회신 없이 삭제해 주세요.\n"
                    + "— IEUM Digital Product Passport";
        }

        /** 메일 본문(HTML) - "자료 제출하러 가기" 버튼. 링크가 없으면 null(텍스트만 보낸다). */
        public String htmlBody() {
            if (link == null) return null;
            String a = esc(link);
            return "<div style=\"font-family:'Apple SD Gothic Neo','Malgun Gothic',Arial,sans-serif;max-width:560px;margin:0 auto;padding:28px 24px;color:#0B1B33\">"
                    + "<div style=\"font-size:13px;font-weight:700;color:#0045A9;letter-spacing:.02em\">IEUM · Digital Product Passport</div>"
                    + "<h2 style=\"margin:10px 0 6px;font-size:20px\">협력사 자료 제출 요청</h2>"
                    + "<p style=\"margin:0 0 18px;font-size:14px;line-height:1.6;color:#44546F\"><b>" + esc(inviterOrgName)
                    + "</b> 담당자가 귀사를 DPP 협력사로 초대했습니다.</p>"
                    + "<table style=\"width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:22px\">"
                    + row("대상 DPP", dppLabel) + row("요청 자료", roleLabel) + row("유효 기간", "발송일로부터 " + expiresInDays + "일")
                    + "</table>"
                    + "<a href=\"" + a + "\" style=\"display:inline-block;padding:13px 26px;background:#0045A9;color:#ffffff;"
                    + "text-decoration:none;border-radius:12px;font-weight:700;font-size:14.5px\">자료 제출하러 가기</a>"
                    + "<p style=\"margin:16px 0 0;font-size:12px;color:#8494AC;line-height:1.6\">버튼을 누르면 초대받은 계정으로 로그인한 뒤 해당 DPP 화면으로 바로 이동합니다.<br>"
                    + "버튼이 동작하지 않으면 아래 주소를 브라우저에 붙여넣어 주세요.<br><span style=\"color:#44546F\">" + a + "</span></p>"
                    + "<hr style=\"border:0;border-top:1px solid #E6EBF2;margin:22px 0 12px\">"
                    + "<p style=\"margin:0;font-size:11.5px;color:#9AA8BE\">본 메일을 잘못 받으셨다면 회신 없이 삭제해 주세요.</p>"
                    + "</div>";
        }

        private static String row(String k, String v) {
            return "<tr><td style=\"padding:8px 0;color:#8494AC;width:90px;border-bottom:1px solid #EEF2F7\">" + esc(k)
                    + "</td><td style=\"padding:8px 0;font-weight:600;border-bottom:1px solid #EEF2F7\">" + esc(v) + "</td></tr>";
        }

        private static String esc(String s) {
            if (s == null) return "";
            return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
        }
    }

    void sendInvite(Invite invite);
}
