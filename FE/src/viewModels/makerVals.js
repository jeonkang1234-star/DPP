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
  // ctx.dashboardData(GET /me/dashboard)가 로드됐으면 실데이터, 아니면 기존 목데이터로 폴백.
  // org_id 없는 계정이나 DPP를 아직 하나도 등록 안 한 조직은 dash가 와도 전부 0/빈 배열 -
  // 그 경우도 실데이터 분기를 그대로 타서 "0건/빈 목록"으로 정직하게 보여준다(가짜 숫자로
  // 안 채움). 목데이터로 폴백하는 건 dashboardData 자체가 아직 도착 전(null)이거나
  // 요청이 실패했을 때뿐.
  const dash = ctx.dashboardData;
  const queueRows = dash
    ? dash.missingFields.map(f => [f.section, f.labelKo, f.dppLabel, f.dppId + '-' + f.fieldCode])
    : queues.map(([due, task, target]) => [due, task, target, task]);
  const completenessRows = dash
    ? dash.dpps.map(d => {
        const done = Math.round(d.completeness);
        return [d.dppId, d.internalSku || ('DPP-' + d.dppId), d.modelName || '(이름 없음)', done, 0, 100 - done];
      })
    : ctx.compData().map(([id, name, done, prog, none]) => [id, id, name, done, prog, none]);
  const inputMeta = data.makerInputMeta[r] || {};
  const fieldSets = data.makerFieldSets[r] || [];
  const isBatch = state.issueMode === 'batch';
  // "강재 기본 정보" 입력 폼 실데이터 - requirement_field 시딩이 STEEL 도메인만 있어서
  // (battery/textile은 seed 자체가 없음) 철강 역할에서만 GET /me/field-form로 대체한다.
  // 그 외 역할은 여전히 기존 목데이터 폼("SPHC" 같은 예시값 포함) - 실 규정 필드가
  // 시딩되기 전까지는 정직하게 흉내낼 수도, 비워둘 수도 없어 손대지 않았다.
  const ff = (r === 'steel') ? ctx.fieldFormData : null;
  const ffInputs = ctx.fieldFormInputs || {};
  const ffFilledCount = ff ? ff.fields.filter(f => !!ffInputs[f.fieldCode]).length : 0;
  return {
    kpiTotal: dash ? String(dash.totalCount) : kpi[0],
    // "이번 달 신규"/"서류 대기"는 실데이터 쪽에 대응하는 집계가 없다(생성일 기준 집계도,
    // 서류별 대기 상태 집계도 아직 안 만듦) - 가짜 숫자 대신 0으로 정직하게.
    kpiNew: dash ? 0 : kpi[1],
    kpiIncomplete: dash ? dash.incompleteCount : kpi[2],
    kpiMissing: dash ? dash.missingFields.length : kpi[3],
    kpiWaiting: dash ? 0 : kpi[4],
    kpiAvg: dash ? Math.round(dash.averageCompleteness) : kpi[5],
    kpiAvgBar: ctx.bar(dash ? Math.round(dash.averageCompleteness) : kpi[5], '#0045A9'),
    // zkp_proof.status='REQUESTED'를 만드는 코드 경로가 아직 없어서 zkpPendingCount는
    // 실데이터에서도 항상 0 - 마찬가지로 가짜 숫자를 넣지 않는다. zkpRejectedCount는 진짜
    // 반려 건수(문서 업로드 -> ZKP 검증 실패 시 REJECTED로 저장된 실제 행).
    zkpPendingCount: dash ? dash.zkpPendingCount : 2,
    zkpRejectedCount: dash ? dash.zkpRejectedCount : 1,
    goInput: () => setState({ tab: 'input' }),
    queue: queueRows.map(([due, task, target, key]) => ({
      key, due, task, target,
      dueDot: ctx.pillDot(due === 'D-1' ? '#E03B3B' : due === 'D-2' ? '#E3A008' : '#9AA8BE'),
      act: () => ctx.say((dash ? '미충족 필드로 이동했습니다 · ' : '작업을 처리 화면으로 이동했습니다 · ') + task)
    })),
    completeness: completenessRows.map(([openId, displayId, name, done, prog, none]) => ({
      key: openId, id: displayId, name, pct: done,
      pctStyle: ctx.pctStyle(done),
      segs: [{ key: 'a', style: ctx.segStyle(done, '#12A150') }, { key: 'b', style: ctx.segStyle(prog, '#E3A008') }, { key: 'c', style: ctx.segStyle(none, '#E03B3B') }],
      open: () => setState({ dppOpen: true, dppId: openId })
    })),
    inputTitle: inputMeta.title, uploadTitle: inputMeta.upload, uploadHint: inputMeta.hint,
    uploadedName: inputMeta.file, ocrCount: inputMeta.ocr, formTitle: inputMeta.form,
    fieldCount: ff ? ff.fields.filter(f => f.required).length : inputMeta.count,
    isBatch,
    singleBtn: ctx.pill(!isBatch), batchBtn: ctx.pill(isBatch),
    setSingle: () => setState({ issueMode: 'single' }),
    setBatch: () => setState({ issueMode: 'batch' }),
    issueLabel: isBatch ? '배치 240건 발급' : 'DPP 발급',
    doUpload: () => ctx.say('파일을 업로드하고 필드를 자동 매핑했습니다.'),
    // ff(실 폼)가 있으면 실제로 저장한다 - 없으면(battery/textile, 아직 시딩 없음) 기존
    // 목데이터 토스트만 보여준다.
    saveDraft: async () => {
      if (!ff) { ctx.say('임시저장했습니다.'); return; }
      try {
        const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
        ctx.setFieldFormData(result);
        ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(f => [f.fieldCode, f.value || ''])));
        setState({ fieldFormDppId: result.dppId });
        ctx.say('임시저장했습니다 · 완성도 ' + Math.round(result.completeness) + '%');
      } catch (e) {
        ctx.say(e.message || '임시저장에 실패했습니다.');
      }
    },
    issueDpp: async () => {
      if (!ff) { ctx.say(isBatch ? '배치 240건의 DPP 발급을 시작했습니다.' : 'DPP를 발급하고 블록체인에 앵커링했습니다.'); return; }
      if (isBatch) { ctx.say('배치 대량 발급은 아직 실데이터 연동 전입니다.'); return; }
      try {
        let dppId = ff.dppId;
        if (!dppId) {
          const draft = await ctx.saveFieldFormDraft(null, ffInputs);
          dppId = draft.dppId;
          setState({ fieldFormDppId: dppId });
        }
        const issued = await ctx.issueFieldFormDpp(dppId);
        ctx.setFieldFormData(issued);
        ctx.setFieldFormInputs(Object.fromEntries((issued.fields || []).map(f => [f.fieldCode, f.value || ''])));
        ctx.say('DPP를 제출했습니다 · 완성도 ' + Math.round(issued.completeness) + '%');
      } catch (e) {
        ctx.say(e.message || 'DPP 발급에 실패했습니다.');
      }
    },
    // ff가 있으면(철강 역할) requirement_field 실 라벨/필수여부 + dpp_field_value 실 저장값,
    // 없으면 기존 목데이터 폼("SPHC" 같은 예시값 포함, 미시딩 도메인 한정 - 위 주석 참고).
    fields: ff
      ? ff.fields.map(f => ({
          key: f.fieldCode, label: f.labelKo + (f.unit ? ' (' + f.unit + ')' : ''),
          req: f.required ? '필수' : '선택', ph: f.helpText || '', value: ffInputs[f.fieldCode] || '',
          hint: f.helpText || '',
          onChange: e => ctx.setFieldFormInputs(prev => ({ ...prev, [f.fieldCode]: e.target.value }))
        }))
      : fieldSets.map(([label, req, ph, value, hint]) => ({
          key: label, label, req, ph, value, hint, onChange: undefined
        })),
    fieldCheck: ff
      ? ff.fields.map(f => {
          const value = ffInputs[f.fieldCode] || '';
          return {
            key: f.fieldCode, label: f.labelKo, filled: !!value,
            dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
            mark: value ? '✓' : '',
            valueText: value || '미입력',
            valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
          };
        })
      : fieldSets.map(([label, req, ph, value]) => ({
          key: label, label, filled: !!value,
          dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
          mark: value ? '✓' : '',
          valueText: value || '미입력',
          valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
        })),
    fieldFilledCount: ff ? ffFilledCount : fieldSets.filter(f => !!f[3]).length,
    fieldTotalCount: ff ? ff.fields.length : fieldSets.length,
    fieldCheckOpen: !!state.fieldCheckOpen,
    openFieldCheck: () => setState({ fieldCheckOpen: true }),
    closeFieldCheck: () => setState({ fieldCheckOpen: false }),
    validations: [
      ['필수 필드 충족', (ff ? ffFilledCount : fieldSets.filter(f => !!f[3]).length) + ' / ' + (ff ? ff.fields.length : fieldSets.length) + '개 입력 완료', (ff ? ffFilledCount === ff.fields.length : fieldSets.every(f => !!f[3])) ? '#12A150' : '#E3A008', true],
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
    // GET /me/invitations 실데이터 - 예전엔 6건이 통째로 하드코딩되어 있었다. status는
    // BE가 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문으로 내려주고, 여기서 한글 라벨/색을
    // 입힌다(scan_history 상태 매핑과 같은 패턴).
    invites: (ctx.invitesData || []).map((i) => {
      const label = { SENT: '대기', ACCEPTED: '수락', REJECTED: '거절', EXPIRED: '만료', REVOKED: '취소' }[i.status] || i.status;
      const color = i.status === 'ACCEPTED' ? '#12A150' : i.status === 'SENT' ? '#E3A008' : '#E03B3B';
      return {
        key: i.invitationId, name: i.orgName, email: i.email, at: i.sentAt, status: label,
        statusDot: ctx.pillDot(color),
        canResend: i.canResend,
        resendStyle: !i.canResend
          ? { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.08)', borderRadius: 9, background: '#F7F9FD', fontSize: 12, fontWeight: 600, color: '#C3CBD9', cursor: 'not-allowed' }
          : { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.12)', borderRadius: 9, background: '#fff', fontSize: 12, fontWeight: 600, color: '#44546F', cursor: 'pointer' },
        resend: async () => {
          if (!i.canResend) return;
          try {
            const updated = await ctx.resendInvitation(i.invitationId);
            ctx.setInvitesData(prev => prev.map(x => x.invitationId === updated.invitationId ? updated : x));
            ctx.say(i.orgName + '에 초대를 재발송했습니다.');
          } catch (e) {
            ctx.say(e.message || '재발송에 실패했습니다.');
          }
        }
      };
    }),
    inviteTotal: (ctx.invitesData || []).length,
    invitePending: (ctx.invitesData || []).filter(i => i.status === 'SENT').length,
    inviteRejected: (ctx.invitesData || []).filter(i => i.status === 'REJECTED').length,
    inviteOrgName: state.inviteOrgName || '',
    onInviteOrgName: e => setState({ inviteOrgName: e.target.value }),
    inviteEmail: state.inviteEmail || '',
    onInviteEmail: e => setState({ inviteEmail: e.target.value }),
    sendInvite: async () => {
      const orgName = (state.inviteOrgName || '').trim();
      const email = (state.inviteEmail || '').trim();
      if (!orgName || !email) { ctx.say('협력사명과 이메일을 입력해 주세요.'); return; }
      try {
        const created = await ctx.sendInvitation(orgName, email);
        ctx.setInvitesData(prev => [created, ...prev]);
        setState({ inviteOrgName: '', inviteEmail: '' });
        ctx.say('초대 메일을 발송했습니다. (유효기간 7일)');
      } catch (e) {
        ctx.say(e.message || '초대 발송에 실패했습니다.');
      }
    },
    // dash(GET /me/dashboard)가 있으면 실 DPP 목록(dash.dpps)에서, 없으면 기존 목데이터에서
    // 구성한다. 실데이터에는 Heat/중량 같은 dpp_field_value 기반 값이 아직 없어서(강재 기본
    // 정보 입력 API 미구축) spec/lot은 domain·serial_number 등 지금 실제로 존재하는 값만
    // 쓰고, 없으면 '—'로 정직하게 표시한다 - 목데이터의 가짜 Heat 번호/날짜를 흉내내지 않는다.
    products: (dash ? dash.dpps : ctx.compData().map(([id, name, done, , , spec]) => ({
      dppId: id, internalSku: id, modelName: name, domain: spec, completeness: done,
      serialNumber: spec.split(' · ')[0], issuedAtDate: null
    }))).filter(d => !state.removedProducts.includes(d.dppId)).map((d) => {
      const id = d.dppId;
      const name = d.modelName || ('DPP #' + id);
      const done = Math.round(d.completeness);
      const spec = d.domain || '';
      const status = done === 100 ? '발급 완료' : done === 0 ? '입력 대기' : '작성 중';
      return {
        key: id, id: d.internalSku || ('DPP-' + id), name, spec, pct: done,
        lot: d.serialNumber || '—',
        at: d.issuedAtDate || '—',
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
