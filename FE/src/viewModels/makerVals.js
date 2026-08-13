import React from 'react';
import { updateOrganization } from '../api/meApi.js';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function makerVals(ctx) {
  const { state, setState, props, data } = ctx;
  const r = state.role;
  const p = ctx.profile();
  const kpi = data.makerKpi[r] || ['0', 0, 0, 0, 0, 0];
  const queues = data.makerQueues[r] || [];
  const inputMeta = data.makerInputMeta[r] || {};
  const fieldSets = data.makerFieldSets[r] || [];
  const isBatch = state.issueMode === 'batch';
  return {
    kpiTotal: kpi[0], kpiNew: kpi[1], kpiIncomplete: kpi[2], kpiMissing: kpi[3], kpiWaiting: kpi[4], kpiAvg: kpi[5],
    kpiAvgBar: ctx.bar(kpi[5], '#0045A9'),
    goInput: () => setState({ tab: 'input' }),
    queue: queues.map(([due, task, target]) => ({
      key: task, due, task, target,
      dueDot: ctx.pillDot(due === 'D-1' ? '#E03B3B' : due === 'D-2' ? '#E3A008' : '#9AA8BE'),
      act: () => ctx.say('작업을 처리 화면으로 이동했습니다 · ' + task)
    })),
    completeness: ctx.compData().map((row, i) => {
      const [id, name, done, prog, none] = row;
      return {
        key: id, id, name, pct: done,
        pctStyle: ctx.pctStyle(done),
        segs: [{ key: 'a', style: ctx.segStyle(done, '#12A150') }, { key: 'b', style: ctx.segStyle(prog, '#E3A008') }, { key: 'c', style: ctx.segStyle(none, '#E03B3B') }],
        open: () => setState({ dppOpen: true, dppId: id })
      };
    }),
    inputTitle: inputMeta.title, uploadTitle: inputMeta.upload, uploadHint: inputMeta.hint,
    uploadedName: inputMeta.file, ocrCount: inputMeta.ocr, formTitle: inputMeta.form, fieldCount: inputMeta.count,
    isBatch,
    singleBtn: ctx.pill(!isBatch), batchBtn: ctx.pill(isBatch),
    setSingle: () => setState({ issueMode: 'single' }),
    setBatch: () => setState({ issueMode: 'batch' }),
    issueLabel: isBatch ? '배치 240건 발급' : 'DPP 발급',
    doUpload: () => ctx.say('파일을 업로드하고 필드를 자동 매핑했습니다.'),
    saveDraft: () => ctx.say('임시저장했습니다.'),
    issueDpp: () => ctx.say(isBatch ? '배치 240건의 DPP 발급을 시작했습니다.' : 'DPP를 발급하고 블록체인에 앵커링했습니다.'),
    fields: fieldSets.map(([label, req, ph, value, hint]) => ({
      key: label, label, req, ph, value, hint
    })),
    fieldCheck: fieldSets.map(([label, req, ph, value]) => ({
      key: label, label, filled: !!value,
      dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
      mark: value ? '✓' : '',
      valueText: value || '미입력',
      valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
    })),
    fieldFilledCount: fieldSets.filter(f => !!f[3]).length,
    fieldTotalCount: fieldSets.length,
    fieldCheckOpen: !!state.fieldCheckOpen,
    openFieldCheck: () => setState({ fieldCheckOpen: true }),
    closeFieldCheck: () => setState({ fieldCheckOpen: false }),
    validations: [
      ['필수 필드 충족', fieldSets.filter(f => !!f[3]).length + ' / ' + fieldSets.length + '개 입력 완료', fieldSets.every(f => !!f[3]) ? '#12A150' : '#E3A008', true],
      ['단위·형식 검증', '모든 수치 항목 단위 일치', '#12A150', false],
      ['제3자 인증서', 'ISO 14001 유효기간 D-12', '#E3A008', false],
      ['재생원료 비율', 'ZKP 증명 미생성 · 발급 전 필요', '#E03B3B', false]
    ].map(([label, detail, c, clickable]) => ({
      key: label, label, detail, dot: ctx.dot(c),
      arrow: clickable ? '→' : '',
      rowStyle: {
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 11, alignItems: 'flex-start',
        padding: clickable ? '10px 12px' : '10px 12px',
        margin: '0 -12px',
        border: clickable ? '1px solid rgba(16,32,64,.09)' : '1px solid transparent',
        borderRadius: 12,
        background: clickable ? '#FBFCFE' : 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left'
      },
      open: () => { if (clickable) setState({ fieldCheckOpen: true }); }
    })),
    invites: [
      ['우진메탈', 'contact@woojinmetal.co.kr', '2026-07-29', '수락'],
      ['태강특수강', 'dpp@taekang.co.kr', '2026-07-28', '대기'],
      ['신흥압연', 'admin@shinheung.kr', '2026-07-26', '수락'],
      ['동보물류', 'log@dongbo.co.kr', '2026-07-24', '대기'],
      ['한영코팅', 'plant@hanyoung.kr', '2026-07-18', '거절'],
      ['세림리사이클', 'eco@serim.co.kr', '2026-07-15', '수락']
    ].map(([name, email, at, status]) => ({
      key: email, name, email, at, status,
      statusDot: ctx.pillDot(status === '수락' ? '#12A150' : status === '대기' ? '#E3A008' : '#E03B3B'),
      canResend: status !== '수락',
      resendStyle: status === '수락'
        ? { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.08)', borderRadius: 9, background: '#F7F9FD', fontSize: 12, fontWeight: 600, color: '#C3CBD9', cursor: 'not-allowed' }
        : { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.12)', borderRadius: 9, background: '#fff', fontSize: 12, fontWeight: 600, color: '#44546F', cursor: 'pointer' },
      resend: () => { if (status !== '수락') ctx.say(name + '에 초대를 재발송했습니다.'); }
    })),
    invRole1: ctx.roleCard(state.invRole !== 2 && state.invRole !== 3),
    invRole2: ctx.roleCard(state.invRole === 2),
    invRole3: ctx.roleCard(state.invRole === 3),
    pickRole1: () => setState({ invRole: 1 }),
    pickRole2: () => setState({ invRole: 2 }),
    pickRole3: () => setState({ invRole: 3 }),
    sendInvite: () => ctx.say('초대 메일을 발송했습니다. (유효기간 7일)'),
    products: ctx.compData().filter(r => !state.removedProducts.includes(r[0])).map((row, i) => {
      const [id, name, done, , , spec] = row;
      const status = done === 100 ? '발급 완료' : done === 0 ? '입력 대기' : '작성 중';
      return {
        key: id, id, name, spec, pct: done,
        lot: spec.split(' · ')[0],
        at: ['2026-07-24', '2026-07-22', '2026-07-19', '2026-07-16', '2026-07-12', '2026-07-08'][i] || '2026-07-05',
        pctStyle: ctx.pctStyle(done),
        statusDot: ctx.pillDot(done === 100 ? '#12A150' : done === 0 ? '#E03B3B' : '#E3A008'),
        status,
        canDelete: done < 100,
        isIssued: done === 100,
        open: () => setState({ dppOpen: true, dppId: id }),
        remove: () => setState({
          confirm: done === 100
            ? {
                title: '발급 완료된 DPP는 삭제할 수 없습니다',
                body: name + ' 은(는) 이미 블록체인에 앵커링되어 DPP 레지스트리에 등록되었습니다. 잘못된 정보라면 폐기 신청으로 무효화 이력을 남길 수 있습니다.',
                label: '폐기 신청',
                danger: false,
                run: () => { setState({ confirm: null }); ctx.say('폐기 신청을 접수했습니다. 관리자 승인 후 무효 처리됩니다.'); }
              }
            : {
                title: 'DPP를 삭제할까요?',
                body: name + ' (' + id + ') 의 작성 중 데이터와 업로드한 문서가 함께 삭제됩니다. 되돌릴 수 없습니다.',
                label: '삭제',
                danger: true,
                run: () => {
                  setState(s => ({ removedProducts: s.removedProducts.concat(id), confirm: null }));
                  ctx.say('DPP를 삭제했습니다.');
                }
              }
        })
      };
    }),
    myBiz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
    myUrl: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || '',
    // ctx.orgData(GET /me/organization)가 로드됐으면 실제 tier_level, 아니면 기존 역할별 자리표시자.
    myTier: ctx.orgData ? ('Tier ' + ctx.orgData.tierLevel) : (r === 'steel' ? 'Tier 3' : 'Tier 2'),
    myTierName: r === 'steel' ? '엔터프라이즈 / Full DPP' : '표준 / 검증 등록',
    myTierDesc: r === 'steel' ? '공급망 하위 업체를 초대해 전체 추적망을 연동할 수 있습니다.' : '제3자 인증서 기반 검증 등록이 가능합니다. Tier 3 신청 시 하위 협력사 연동이 열립니다.',
    requestTier: () => ctx.say('상위 Tier 신청서를 제출했습니다. 자동심사 진행 중입니다.'),
    requestPerm: () => ctx.say('권한 추가 신청이 관리자에게 전달되었습니다.'),
    saveProfile: () => ctx.say('기업 정보를 수정했습니다.'),
    myPerms: [['DPP 발급·수정', 1], ['협력사 초대', 1], ['ZKP 증명 제출', r === 'steel' ? 1 : 0], ['감사 로그 열람', 0], ['배치 대량 발급', r === 'steel' ? 1 : 0]].map(([label, on]) => ({
      key: label, label, style: on ? ctx.chip('rgba(0,69,169,.10)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#9AA8BE')
    })),
    myDocs: [
      ['사업자등록증.pdf', 'PDF · 1.2MB · 2026-01-04 업로드', '승인'],
      ['공장등록증.pdf', 'PDF · 0.8MB · 2026-01-04 업로드', '승인'],
      ['ISO_14001.pdf', 'PDF · 2.4MB · 2026-06-11 업로드', '검증 중'],
      ['ESG_보고서_2025.pdf', 'PDF · 5.1MB · 2026-03-22 업로드', '승인']
    ].map(([name, meta, status]) => ({
      key: name, name, meta, status,
      dot: ctx.pillDot(status === '승인' ? '#12A150' : '#E3A008'),
      view: () => setState({ docPreview: { name, meta, status } })
    })),
    // ctx.orgData(GET /me/organization 실 데이터)가 있으면 그걸 우선 쓰고, 없으면(org_id
    // 없는 계정 등) 기존 역할별 목데이터로 폴백한다. state.profile은 로그아웃 전까지 남는
    // 로컬 수정 이력(orgData 없을 때만 의미 있음) - orgData가 생긴 뒤로는 안 쓴다.
    profileName: ctx.orgData ? ctx.orgData.orgName : (state.profile ? state.profile.name : p.ws),
    profileBiz: ctx.orgData ? ctx.orgData.bizRegNo : (state.profile ? state.profile.biz : ({ steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '')),
    profilePhone: ctx.orgData ? (ctx.orgData.contactPhone || '미입력') : (state.profile ? state.profile.phone : '02-3480-1200'),
    profileUrl: ctx.orgData ? (ctx.orgData.websiteUrl || '') : (state.profile ? state.profile.url : ({ steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || '')),
    openProfileEdit: () => setState({
      profileEdit: ctx.orgData
        ? {
            name: ctx.orgData.orgName,
            biz: ctx.orgData.bizRegNo || '',
            phone: ctx.orgData.contactPhone || '',
            url: ctx.orgData.websiteUrl || ''
          }
        : (state.profile || {
            name: p.ws,
            biz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
            phone: '02-3480-1200',
            url: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || ''
          })
    }),
    profileEditOpen: !!state.profileEdit,
    // 사업자등록번호는 편집 UI에는 보이되(참고용) 입력 자체를 막는다 - 백엔드도 이 값을
    // PUT /me/organization으로 안 받는다(가입 시 확정, 국세청 연동 재심사 필요 - 화면에
    // 이미 있는 안내문구와 일치).
    editBizReadOnly: !!ctx.orgData,
    editName: state.profileEdit && state.profileEdit.name,
    editBiz: state.profileEdit && state.profileEdit.biz,
    editPhone: state.profileEdit && state.profileEdit.phone,
    editUrl: state.profileEdit && state.profileEdit.url,
    onEditName: e => setState(s => ({ profileEdit: { ...s.profileEdit, name: e.target.value } })),
    onEditBiz: e => setState(s => ({ profileEdit: { ...s.profileEdit, biz: e.target.value } })),
    onEditPhone: e => setState(s => ({ profileEdit: { ...s.profileEdit, phone: e.target.value } })),
    onEditUrl: e => setState(s => ({ profileEdit: { ...s.profileEdit, url: e.target.value } })),
    cancelProfileEdit: () => setState({ profileEdit: null }),
    commitProfileEdit: async () => {
      const edit = state.profileEdit;
      if (!ctx.orgData) {
        // 소속 조직이 없는 계정(org_id NULL) - 저장할 백엔드 리소스가 없어 로컬에만 남긴다.
        setState({ profile: edit, profileEdit: null });
        ctx.say('기업 기본정보를 저장했습니다.');
        return;
      }
      try {
        const updated = await updateOrganization({
          orgName: edit.name,
          contactPhone: edit.phone,
          websiteUrl: edit.url
        });
        ctx.setOrgData(updated);
        setState({ profileEdit: null });
        ctx.say('기업 기본정보를 저장했습니다.');
      } catch (e) {
        ctx.say(e.message || '기업 정보를 저장하지 못했습니다.');
      }
    }
  };
}
