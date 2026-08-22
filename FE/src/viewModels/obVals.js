import React from 'react';
import { clearSession } from '../api/session.js';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 *
 * 2026-08-21 강 요청으로 세 유형 모두 2단계로 줄였다.
 *  - 제조사/협력사: 도메인 선택 -> 기업 기본정보 확인. 회사명·사업자등록번호는 가입 때 받은
 *    값을 그대로 읽기 전용으로 보여준다(1번). 증빙서류 업로드(2번)·Tier 신청(3번)·
 *    권한 신청(4번) 단계는 삭제 - 증빙서류는 가입 화면에서 이미 한 번 받는다.
 *  - 세관: 공식 기관 식별 코드 -> 증빙서류 업로드. 시스템 연동 인증 정보(7번)·공공 전자
 *    인증서와 그 아래 목데이터(7번)·통관 조회 권한(8번) 삭제.
 *  - 시장감독기관: 공식 기관 식별 코드 -> 개별 신원 정보. '조사관' 표현·정부 통합 SSO
 *    버튼·공공 전자 인증서·민감 데이터 열람 권한 삭제(10번).
 * 세관/시장감독기관은 온보딩을 끝내는 순간 로그아웃된다 - 관리자 승인 전까지는 다시
 * 로그인할 수 없다(9번, 서버 쪽은 PasswordAuthService.requireApprovedOrganization).
 * 입력 내용과 계정은 DB에 그대로 남는다.
 */
export function obVals(ctx) {
  const { state, setState, props } = ctx;
  const st = state.obStep;
  const kind = state.obKind || 'maker';
  const isCustoms = kind === 'customs';
  const isEu = kind === 'eu';
  // 세관·시장감독기관은 2단계를 통째로 뺐다(2026-08-22 강 요청). 증빙서류는 이미 회원가입
  // 화면에서 받고 있어 온보딩에서 또 받으면 같은 문서를 두 번 내는 꼴이었고, 시장감독기관의
  // 「개별 신원 정보」도 기관 식별 코드와 겹치는 내용이었다.
  const titles = isCustoms || isEu
    ? ['공식 기관 식별 코드']
    : ['도메인 선택하기', '기업 기본정보 확인'];
  const lastStep = titles.length;
  const hints = isCustoms
    ? ['국가 및 관할 세관을 나타내는 고유 ID를 등록합니다']
    : isEu
      ? ['국가 및 담당 관할 구역을 나타내는 기관 ID를 등록합니다']
      : ['선택한 도메인에 맞는 입력 화면이 제공됩니다', '회사명·사업자등록번호는 가입 시 확정되어 수정할 수 없습니다'];
  const d = state.obDomain;
  // 가입 때 받은 조직 정보(GET /me/organization). 아직 로드 전이면 가입 화면 입력값을
  // 폴백으로 쓴다 - 가입 직후 바로 열리는 화면이라 orgData가 늦게 오는 경우가 있다.
  const org = ctx.orgData;
  const obCompanyName = (org && org.orgName) || state.suCompanyName || '';
  const obBizRegNo = (org && org.bizRegNo) || state.suBizRegNo || '';
  const finish = () => {
    if (isCustoms || isEu) {
      // 관리자 승인 전까지는 로그인 불가(2026-08-21 강 요청 9번). 온보딩 입력은 저장된
      // 상태로 두고 세션만 끊는다 - 서버도 승인 전 로그인을 403으로 막으므로, 여기서
      // 세션을 남겨두면 다음 API 호출에서 조용히 깨진 화면을 보게 된다.
      clearSession();
      ctx.resetSession();
      ctx.say('온보딩이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
      return;
    }
    setState({ obOpen: false, obSaved: lastStep, role: d, tab: 'dash' });
    ctx.say('온보딩을 완료했습니다. ' + (d === 'steel' ? '철강' : d === 'battery' ? '배터리' : '섬유·패션') + ' 대시보드로 이동합니다.');
  };
  return {
    obOpen: state.obOpen,
    obStep: st,
    obLastStep: lastStep,
    obTitle: titles[st - 1],
    obHint: hints[st - 1],
    obNextLabel: st >= lastStep ? '온보딩 완료' : '다음 단계',
    obBars: Array.from({ length: lastStep }, (_, i) => i + 1).map(i => ({ key: i, style: { flex: 1, height: 5, borderRadius: 3, background: i <= st ? '#0045A9' : '#E7EDF7' } })),
    obIsCustoms: isCustoms,
    obIsGov: isCustoms || isEu,
    obGovBanner: (isCustoms || isEu) && (state.obSaved || 0) > 0 && (state.obSaved || 0) < lastStep,
    obGovBannerText: '온보딩 ' + (state.obSaved || 1) + '단계 「' + titles[(state.obSaved || 1) - 1] + '」에서 중단되었습니다.',
    obIs1: st === 1 && kind === 'maker',
    obIs2: st === 2 && kind === 'maker',
    obG1: st === 1 && (isCustoms || isEu),
    obCompanyName,
    obBizRegNo,
    obGovIdLabel: isCustoms ? '관할 세관' : '담당 관할 구역',
    obGovIdPlaceholder: isCustoms ? '예) 인천세관 (INC)' : '예) 수도권 관할 (KR-SEO)',
    obGovCodeSample: isCustoms ? 'KR-INC-020' : 'KR-MSA-011',
    obGovOrgPlaceholder: isCustoms ? '예) 관세청 인천세관 수입통관과' : '예) 국가기술표준원 제품안전조사과',
    obClose: () => {
      const done = (state.obSaved || 0) >= lastStep;
      const backTab = isCustoms ? 'clearance' : isEu ? 'registry' : 'my';
      setState({ obOpen: false, obSaved: Math.max(state.obSaved || 0, st), tab: backTab });
      if (done) ctx.say('온보딩 내용을 닫았습니다.');
      else if (isCustoms || isEu) ctx.say('작성 중인 내용을 저장했습니다. 상단 「온보딩 이어서 작성」에서 다시 열 수 있습니다.');
      else ctx.say('작성 중인 내용을 저장했습니다. 마이페이지에서 이어서 진행할 수 있습니다.');
    },
    obResume: () => setState({ obOpen: true, obStep: state.obSaved || 1 }),
    obIncomplete: (state.obSaved || 0) > 0 && (state.obSaved || 0) < lastStep,
    obComplete: (state.obSaved || 0) >= lastStep,
    obDomainLabel: d === 'steel' ? '철강' : d === 'battery' ? '배터리' : '섬유·패션',
    obReview: () => setState({ obOpen: true, obStep: 1 }),
    obSavedStep: state.obSaved || 1,
    obSavedTitle: titles[(state.obSaved || 1) - 1],
    obSavedBar: { display: 'block', height: '100%', width: (((state.obSaved || 1) - 1) / lastStep * 100) + '%', borderRadius: 6, background: '#0045A9' },
    obSavedPct: Math.round(((state.obSaved || 1) - 1) / lastStep * 100),
    obPrev: () => setState({ obStep: Math.max(1, st - 1) }),
    obNext: () => (st >= lastStep ? finish() : setState({ obStep: st + 1 })),
    docPreviewOpen: !!state.docPreview,
    docPreviewName: state.docPreview && state.docPreview.name,
    docPreviewMeta: state.docPreview && state.docPreview.meta,
    docPreviewStatus: state.docPreview && state.docPreview.status,
    docPreviewChip: state.docPreview && (state.docPreview.status === '업로드 완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(227,160,8,.16)', '#96660A')),
    closeDocPreview: () => setState({ docPreview: null }),
    downloadDoc: () => ctx.say('원본 파일을 내려받습니다.'),
    obSteelCard: ctx.domainCard(d === 'steel'), obBatteryCard: ctx.domainCard(d === 'battery'), obTextileCard: ctx.domainCard(d === 'textile'),
    obPickSteel: () => setState({ obDomain: 'steel' }),
    obPickBattery: () => setState({ obDomain: 'battery' }),
    obPickTextile: () => setState({ obDomain: 'textile' })
  };
}
