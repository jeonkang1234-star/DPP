package com.dpp.auth.service;

/**
 * (미사용) 알리고(Aligo) 연동 초안 - 결국 SENS로 진행하기로 해서 비활성화해뒀다.
 * 실제 발송은 SensSignupSmsSender가 담당한다 (SignupSmsSender 구현체).
 *
 * @Component/@ConditionalOnProperty를 일부러 빼서 스프링 빈으로 등록되지 않게 해뒀다 -
 * SensSignupSmsSender와 동시에 활성화되면 SignupSmsSender 구현체가 2개가 되어
 * 어느 걸 주입할지 스프링이 결정하지 못해 기동이 실패한다.
 * 나중에 알리고로 다시 전환하고 싶으면 이 파일을 지우고 git 히스토리에서 이전 버전을 복원하면 된다.
 */
final class AligoSignupSmsSender {
    private AligoSignupSmsSender() {
    }
}
