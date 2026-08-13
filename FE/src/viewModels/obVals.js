import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function obVals(ctx) {
  const { state, setState, props } = ctx;
  const st = state.obStep;
  const kind = state.obKind || 'maker';
  const isCustoms = kind === 'customs';
  const isEu = kind === 'eu';
  const titles = isCustoms
    ? ['공식 기관 식별 코드', '시스템 연동 인증 정보', '공공 전자 인증서', '통관 조회 권한']
    : isEu
      ? ['공식 기관 식별 코드', '조사관 개별 신원 정보', '공공 전자 인증서', '민감 데이터 열람 권한']
      : ['도메인 선택하기', '기업 기본정보 입력', '증빙서류 업로드', 'Tier 신청', '권한 신청'];
  const lastStep = (isCustoms || isEu) ? 4 : 5;
  const hints = isCustoms
    ? ['국가 및 관할 세관을 나타내는 고유 ID를 등록합니다', '국가 통관 시스템(Single Window)과 자동 연동됩니다', 'eIDAS 적격 전자신원 인증서를 등록합니다', '승인된 범위의 UPI만 조회·검증할 수 있습니다']
    : isEu
      ? ['국가 및 담당 관할 구역을 나타내는 기관 ID를 등록합니다', '단속 담당 공무원의 사번과 통합 로그인을 연결합니다', 'eIDAS 적격 전자신원 인증서를 등록합니다', '제한된 데이터 열람에는 법적 권한 증명과 조사 목적 기록이 필요합니다']
      : ['선택한 도메인에 맞는 입력 화면이 제공됩니다', '사업자등록번호는 국세청 정보와 자동 대조됩니다', '사업자등록증은 필수 서류입니다', '자동심사 실패 시 관리자 수동 심사로 이관됩니다', '승인 즉시 대시보드에서 사용할 수 있습니다'];
  const d = state.obDomain;
  const t = state.obTier;
  const finish = () => {
    if (isCustoms) {
      setState({ obOpen: false, obSaved: lastStep, role: 'customs', tab: 'clearance' });
      ctx.say('온보딩을 완료했습니다. 통관 검증 화면으로 이동합니다.');
      return;
    }
    if (isEu) {
      setState({ obOpen: false, obSaved: lastStep, role: 'eu', tab: 'registry' });
      ctx.say('온보딩을 완료했습니다. DPP 레지스트리 화면으로 이동합니다.');
      return;
    }
    setState({ obOpen: false, obSaved: 5, role: d, tab: 'dash' });
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
    obIs1: st === 1 && kind === 'maker', obIs2: st === 2 && kind === 'maker', obIs3: st === 3 && kind === 'maker', obIs4: st === 4 && kind === 'maker', obIs5: st === 5 && kind === 'maker',
    obG1: st === 1 && (isCustoms || isEu),
    obG3: st === 3 && (isCustoms || isEu),
    obC2: st === 2 && isCustoms, obC4: st === 4 && isCustoms,
    obM2: st === 2 && isEu, obM4: st === 4 && isEu,
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
    obTierLabel: 'Tier ' + t,
    obTierSub: t === 1 ? '기초 / 셀프 등록' : t === 2 ? '표준 / 검증 등록' : '엔터프라이즈 / Full DPP',
    obPermList: [['DPP 발급·수정', true], ['협력사 초대', true], ['ZKP 증명 제출', t === 3], ['감사 로그 열람', false]].map(([label, on]) => ({
      key: label, label,
      style: on ? ctx.chip('rgba(0,69,169,.10)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#9AA8BE')
    })),
    obReview: () => setState({ obOpen: true, obStep: 1 }),
    obSavedStep: state.obSaved || 1,
    obSavedTitle: titles[(state.obSaved || 1) - 1],
    obSavedBar: { display: 'block', height: '100%', width: (((state.obSaved || 1) - 1) / 5 * 100) + '%', borderRadius: 6, background: '#0045A9' },
    obSavedPct: Math.round(((state.obSaved || 1) - 1) / 5 * 100),
    obPrev: () => setState({ obStep: Math.max(1, st - 1) }),
    obNext: () => (st >= lastStep ? finish() : setState({ obStep: st + 1 })),
    obDocs: [
      ['사업자등록증.pdf', 'PDF · 1.2MB · 2026-08-03 업로드', '업로드 완료'],
      ['공장등록증.pdf', 'PDF · 0.8MB · 2026-08-03 업로드', '업로드 완료'],
      ['ISO_14001.pdf', 'PDF · 2.4MB · 2026-08-03 업로드', '검증 중']
    ].filter(f => !(state.obRemovedDocs || []).includes(f[0])).map(([name, meta, status]) => ({
      key: name, name, meta, status,
      chip: status === '업로드 완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
      view: () => setState({ docPreview: { name, meta, status } }),
      remove: () => {
        setState(s => ({ obRemovedDocs: (s.obRemovedDocs || []).concat(name) }));
        ctx.say(name + ' 을(를) 삭제했습니다.');
      }
    })),
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
    obPickTextile: () => setState({ obDomain: 'textile' }),
    obTier1Card: ctx.roleCard(t === 1), obTier2Card: ctx.roleCard(t === 2), obTier3Card: ctx.roleCard(t === 3),
    obTier1: () => setState({ obTier: 1 }), obTier2: () => setState({ obTier: 2 }), obTier3: () => setState({ obTier: 3 })
  };
}
