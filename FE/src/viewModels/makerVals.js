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
  // "필수 문서" 업로드 실데이터(GET /me/documents) - ff와 마찬가지로 철강 역할, 그리고
  // dppId가 이미 있을 때만(초안조차 없으면 문서를 붙일 곳이 없음).
  const df = (r === 'steel') ? ctx.documentFormData : null;
  // Mill Sheet 업로드 결과 실데이터 - 예전엔 이 카드 전체가 목데이터였다(버튼 눌러도 실제
  // 파일선택창 자체가 안 뜨고 가짜 토스트만 나옴, 2026-08-14 사용자 리포트로 발견).
  const msr = (r === 'steel') ? ctx.millSheetResult : null;
  // CBAM 업로드 결과 실데이터 - Mill Sheet와 같은 패턴(2026-08-15).
  const cbr = (r === 'steel') ? ctx.cbamResult : null;
  const DOC_STATUS_LABEL = { NOT_UPLOADED: '미제출', PENDING: '검토 중', APPROVED: '제출 완료', REJECTED: '반려됨', EXPIRED: '만료됨' };
  const DOC_STATUS_COLOR = { NOT_UPLOADED: '#9AA8BE', PENDING: '#E3A008', APPROVED: '#12A150', REJECTED: '#E03B3B', EXPIRED: '#C22B2B' };
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
    // "+ 새 DPP 발급" 버튼 - 진행 중이던 draft dppId를 안 지우면 이 버튼을 눌러도 이전
    // draft가 그대로 다시 열려서 두 번째 DPP를 새로 시작할 방법이 없었다(2026-08-15, 강
    // 리포트). fieldFormDppId를 null로 같이 넘기면 위 useAppLogic의 field-form fetch
    // effect가 dppId=undefined로 다시 불러서 진짜 빈 초안을 받아온다(FieldFormService.
    // getForm의 dppId==null 분기). 특정 기존 DPP를 "이어서 작성"하는 경로(완성도 목록의
    // open 핸들러, 아래 424번째 줄 근처)는 fieldFormDppId를 그 DPP id로 명시적으로 넘기니
    // 이 초기화와 충돌하지 않는다. millSheetResult/cbamResult/fieldFormInputs/
    // documentFormData도 같이 비워야 이전 DPP의 업로드 결과·입력값이 새 화면에 잠깐이라도
    // 남아 보이지 않는다.
    goInput: () => {
      ctx.setMillSheetResult(null);
      ctx.setCbamResult(null);
      ctx.setFieldFormInputs({});
      ctx.setDocumentFormData(null);
      setState({ tab: 'input', fieldFormDppId: null });
    },
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
    // msr(실제 업로드 결과)이 있으면 그걸, 없으면 아직 아무것도 업로드 안 한 상태 -
    // 예전엔 항상 mock 파일명/건수가 떠있어서 마치 이미 업로드된 것처럼 보였다.
    uploadedName: msr ? msr.fileName : '',
    ocrCount: msr ? Object.keys(msr.verdicts || {}).length : 0,
    hasMillSheetResult: !!msr,
    millSheetInputId: 'mill-sheet-upload',
    // specPassed(12개 항목 전부 규격 충족)를 봐야 한다 - cryptoVerified는 증명 자체의
    // 크립토 유효성일 뿐이라 규격 미달이어도 거의 항상 true다(2026-08-15 수정, 강 리포트).
    millSheetStatusLabel: msr ? (msr.specPassed ? '검증 통과' : '검증 실패') : '',
    millSheetStatusChip: msr
      ? (msr.specPassed ? ctx.chip('rgba(18,161,80,.10)', '#12A150') : ctx.chip('rgba(224,59,59,.10)', '#E03B3B'))
      : ctx.tier2Chip,
    formTitle: inputMeta.form,
    fieldCount: ff ? ff.fields.filter(f => f.required).length : inputMeta.count,
    isBatch,
    singleBtn: ctx.pill(!isBatch), batchBtn: ctx.pill(isBatch),
    setSingle: () => setState({ issueMode: 'single' }),
    setBatch: () => setState({ issueMode: 'batch' }),
    issueLabel: isBatch ? '배치 240건 발급' : 'DPP 발급',
    // 예전엔 이 버튼이 실제 파일선택창도 안 띄우고 가짜 토스트만 보여줬다 - 이제
    // AppView의 숨겨진 <input type="file" id={millSheetInputId}>를 라벨로 트리거해서
    // 실제 /document/upload/steel-mill(파서 -> ZKP -> 블록체인)로 올린다.
    onMillSheetFileChange: async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      ctx.say('업로드 중 · 화학성분/기계적성질 검증에는 수십 초가 걸릴 수 있습니다.');
      try {
        const result = await ctx.uploadSteelMillSheet(file);
        ctx.setMillSheetResult({ ...result, fileName: file.name });
        if (result.dppId) {
          setState({ fieldFormDppId: result.dppId });
          ctx.refreshFieldForm(result.dppId);
          ctx.refreshDocumentForm(result.dppId);
        }
        ctx.say(result.specPassed ? '제강 성적서 검증을 통과했습니다.' : '제강 성적서 검증에 실패했습니다 - 규격 미달 항목이 있습니다.');
      } catch (err) {
        ctx.say(err.message || '문서 업로드에 실패했습니다.');
      }
    },
    // CBAM(Q2_06) 탄소보고서 업로드 - obligated는 "적합/부적합"이 아니라 "de minimis
    // 수입량(50t) 초과로 신고 의무가 발생했는가"라서 true/false 둘 다 정상 결과다. 그래서
    // Mill Sheet처럼 "검증 통과/실패"라고 하면 안 되고 "신고 의무 있음/없음"으로 표시한다.
    uploadedCbamName: cbr ? cbr.fileName : '',
    hasCbamResult: !!cbr,
    cbamInputId: 'cbam-upload',
    cbamStatusLabel: cbr ? (cbr.obligated ? 'CBAM 신고 의무 있음' : 'CBAM 신고 의무 없음(de minimis 이하)') : '',
    cbamStatusChip: cbr
      ? (cbr.obligated ? ctx.chip('rgba(227,160,8,.10)', '#E3A008') : ctx.chip('rgba(18,161,80,.10)', '#12A150'))
      : ctx.tier2Chip,
    cbamImportQtyLabel: cbr ? (cbr.importQuantityT + 't (기준 ' + cbr.deMinimisT + 't)') : '',
    onCbamFileChange: async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      ctx.say('업로드 중 · 수입량 검증에 시간이 걸릴 수 있습니다.');
      try {
        const result = await ctx.uploadCbamReport(file);
        ctx.setCbamResult({ ...result, fileName: file.name });
        if (result.dppId) {
          setState({ fieldFormDppId: result.dppId });
          ctx.refreshFieldForm(result.dppId);
          ctx.refreshDocumentForm(result.dppId);
        }
        ctx.say(result.obligated
          ? 'CBAM 신고 의무가 있습니다 (수입량이 de minimis 기준을 초과).'
          : 'CBAM 신고 의무가 없습니다 (수입량이 de minimis 기준 이하).');
      } catch (err) {
        ctx.say(err.message || '문서 업로드에 실패했습니다.');
      }
    },
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
    // 필수 문서 10종(제강 성적서 포함, 다만 그건 업로드 시 별도 파서/ZKP 엔드포인트를 씀)
    // 실데이터 - df가 없으면(초안 저장 전이거나 철강 역할이 아니면) 빈 목록. 예전엔 이
    // 목록(왼쪽 "필수 문서" 카드)이랑 오른쪽 "입력 검증 결과" 패널 아래 두 카드(검증 필요
    // 데이터/형식만 확인)가 완전히 같은 문서를 두 번 보여주는 중복이었다(2026-08-15 사용자
    // 피드백: "굳이 아래에 넣어야 하나 싶어") - 오른쪽 두 카드는 걷어내고, 이 한 목록 안에
    // 카테고리 배지(category*)와 진행 단계(steps: 미제출→검증 중→제출 완료)를 같이 넣어서
    // 정보를 한 곳에서만 보여준다. "검증 중" 단계는 서버가 PENDING을 내려줄 때뿐 아니라,
    // 업로드 요청이 아직 응답을 안 받은 동안(uploadingDocTypes)도 표시한다 - 지금은 문서
    // 9종이 업로드 즉시 동기 응답(APPROVED)이라 PENDING 상태가 서버에 실제로 존재하지
    // 않고, Mill Sheet만 파서+ZKP로 수십 초가 걸려서 이 클라이언트 쪽 표시가 사실상
    // 유일한 "검증 중" 시각화다.
    documentSlots: df
      ? df.documents.map(d => {
          const uploading = (state.uploadingDocTypes || []).includes(d.docTypeCode);
          const failed = !uploading && (d.status === 'REJECTED' || d.status === 'EXPIRED');
          const stageIdx = uploading || d.status === 'PENDING' ? 1
            : (d.status === 'APPROVED' || d.status === 'REJECTED' || d.status === 'EXPIRED') ? 2
            : 0;
          // 마지막 단계("제출 완료")에 도달한 시점을 '진행 중(active, 노란색)'과 '완료(done,
          // 초록색)'로 나눠야 하는데, i < stageIdx만으로는 stageIdx 자체(=마지막 단계)가
          // 영원히 '진행 중'으로만 남아서 승인된 뒤에도 계속 노란불이었다(2026-08-15 사용자
          // 리포트: "제출 완료에 계속 노란색으로 떠있어"). stageIdx===2이고 실패가 아니면
          // 그 단계 자체를 done으로 표시해야 한다 - "검증 중"(stageIdx===1)일 때만 진짜
          // active(진행 중)로 남겨둔다.
          const success = stageIdx === 2 && !failed;
          return {
            key: d.fieldCode, label: d.labelKo, req: d.required ? '필수' : '선택',
            fileName: d.fileName || '',
            statusLabel: uploading ? '검증 중' : (DOC_STATUS_LABEL[d.status] || d.status),
            dot: ctx.pillDot(uploading ? '#E3A008' : (DOC_STATUS_COLOR[d.status] || '#9AA8BE')),
            categoryLabel: d.zkpTarget ? '데이터 검증' : '형식 확인',
            categoryChip: d.zkpTarget ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#6B7A93'),
            steps: ['미제출', '검증 중', '제출 완료'].map((label, i) => ({
              key: label, label,
              status: (i < stageIdx || (i === stageIdx && success)) ? 'done'
                : i === stageIdx ? (failed ? 'failed' : 'active')
                : 'upcoming'
            })),
            // 데이터 검증(ZKP) 대상 문서(Mill Sheet, CBAM 등)는 이 일반 업로드 버튼으로
            // 못 올린다 - 서버가 이제 막고 있고(DocumentSlotService.upload), 애초에 파서+
            // ZKP를 안 거치는 이 경로로 올리면 증명 없이 승인된 것처럼 보이는 구멍이었다
            // (2026-08-15). 대신 화면 위쪽 전용 업로드 박스를 쓰라고 안내만 한다.
            uploadDisabled: d.zkpTarget,
            inputId: 'doc-upload-' + d.fieldCode,
            onFileChange: async (e) => {
              const file = e.target.files && e.target.files[0];
              e.target.value = '';
              if (!file) return;
              if (d.zkpTarget) { ctx.say(d.labelKo + '는 위쪽 전용 업로드 박스를 이용해 주세요.'); return; }
              if (!state.fieldFormDppId) { ctx.say('먼저 임시저장으로 DPP를 만든 뒤 문서를 올려 주세요.'); return; }
              setState({ uploadingDocTypes: [...(state.uploadingDocTypes || []), d.docTypeCode] });
              try {
                const result = await ctx.uploadDocument(state.fieldFormDppId, d.docTypeCode, file);
                ctx.setDocumentFormData(result);
                ctx.say(d.labelKo + ' 업로드했습니다.');
              } catch (err) {
                ctx.say(err.message || '문서 업로드에 실패했습니다.');
              } finally {
                setState({ uploadingDocTypes: (state.uploadingDocTypes || []).filter(c => c !== d.docTypeCode) });
              }
            }
          };
        })
      : [],
    documentSlotsEmpty: df ? df.documents.length === 0 : true,
    openFieldCheck: () => setState({ fieldCheckOpen: true }),
    closeFieldCheck: () => setState({ fieldCheckOpen: false }),
    validations: [
      ['필수 필드 충족', (ff ? ffFilledCount : fieldSets.filter(f => !!f[3]).length) + ' / ' + (ff ? ff.fields.length : fieldSets.length) + '개 입력 완료', (ff ? ffFilledCount === ff.fields.length : fieldSets.every(f => !!f[3])) ? '#12A150' : '#E3A008', true]
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
    // "협력사 초대"는 이제 회사 대 회사 일반 연결이 아니라 특정 DPP에 대한 초대 - 화면에
    // 먼저 이 조직의 DPP 목록을 보여주고, 하나를 고르면 그 DPP에 여러 협력사를 한 번에
    // 초대할 수 있다(DppParticipant가 그 DPP의 "누가 뭘 채우는지" 실제 연결이 됨).
    partnerDpps: (dash ? dash.dpps : []).map(d => {
      const selected = state.partnersDppId === d.dppId;
      return {
        key: d.dppId, id: d.internalSku || ('DPP-' + d.dppId), name: d.modelName || ('DPP #' + d.dppId),
        pct: Math.round(d.completeness), selected,
        cardStyle: {
          display: 'flex', flexDirection: 'column', gap: 4, minWidth: 168, padding: '12px 14px',
          border: selected ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.10)', borderRadius: 13,
          background: selected ? '#0045A9' : '#fff', color: selected ? '#fff' : '#0B1B33',
          cursor: 'pointer', textAlign: 'left', flex: 'none'
        },
        select: () => setState({ partnersDppId: d.dppId, inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }] })
      };
    }),
    partnerDppsEmpty: !dash || dash.dpps.length === 0,
    partnersHasSelection: !!state.partnersDppId,
    partnersSelectedDppName: (() => {
      const found = dash && dash.dpps.find(d => d.dppId === state.partnersDppId);
      return found ? (found.modelName || ('DPP #' + found.dppId)) : '';
    })(),
    // GET /me/invitations?dppId= 실데이터 - 예전엔 6건이 통째로 하드코딩되어 있었다. status는
    // BE가 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문으로 내려주고, 여기서 한글 라벨/색을
    // 입힌다(scan_history 상태 매핑과 같은 패턴). invitesData는 전체를 한 번에 불러오고
    // 여기서 선택된 DPP로만 걸러서 보여준다.
    invites: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).map((i) => {
      const label = { SENT: '대기', ACCEPTED: '수락', REJECTED: '거절', EXPIRED: '만료', REVOKED: '취소' }[i.status] || i.status;
      const color = i.status === 'ACCEPTED' ? '#12A150' : i.status === 'SENT' ? '#E3A008' : '#E03B3B';
      const roleLabel = { RAW_SUPPLIER: '원자재·화학 공급사', TEST_LAB: '시험·인증기관' }[i.roleCode] || i.roleCode;
      return {
        key: i.invitationId, name: i.orgName, email: i.email, at: i.sentAt, status: label, roleLabel,
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
    invitesEmpty: !!state.partnersDppId && (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).length === 0,
    inviteTotal: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).length,
    invitePending: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId && i.status === 'SENT').length,
    inviteRejected: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId && i.status === 'REJECTED').length,
    // 다중 발송 폼 - 협력사명/이메일 행을 여러 개 만들어 한 번에 보낼 수 있게. 백엔드
    // API 자체는 여전히 1건씩만 받아서(SendInviteRequest 참고), sendInvite가 행 수만큼
    // 반복 호출한다.
    // 역할 선택지 - 초대 대상 협력사가 실제로 뭘 제출하게 되는지 미리 보여준다(2026-08-15,
    // requirement_field.responsible_role이 RAW_SUPPLIER/TEST_LAB 둘로 나뉘면서 추가).
    inviteRoleOptions: [
      { value: 'RAW_SUPPLIER', label: '원자재·화학 공급사 (스크랩 매입증빙, SDS 등)' },
      { value: 'TEST_LAB', label: '시험·인증기관 (시험성적서, LCA/EPD, 탄소보고서)' }
    ],
    inviteRows: (state.inviteRows && state.inviteRows.length ? state.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((row, idx, arr) => ({
      key: idx, orgName: row.orgName, email: row.email, roleCode: row.roleCode || 'RAW_SUPPLIER', canRemove: arr.length > 1,
      onOrgName: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, orgName: e.target.value } : r) })),
      onEmail: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, email: e.target.value } : r) })),
      onRoleCode: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, roleCode: e.target.value } : r) })),
      remove: () => setState(s => ({ inviteRows: (s.inviteRows || []).filter((_, i) => i !== idx) }))
    })),
    addInviteRow: () => setState(s => ({ inviteRows: (s.inviteRows && s.inviteRows.length ? s.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).concat([{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]) })),
    inviteSendLabel: (state.inviteRows || []).length > 1 ? `초대 발송 (${state.inviteRows.length}건)` : '초대 발송',
    sendInvite: async () => {
      const dppId = state.partnersDppId;
      if (!dppId) { ctx.say('먼저 DPP를 선택해 주세요.'); return; }
      const rows = (state.inviteRows && state.inviteRows.length ? state.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }])
        .map(r => ({ orgName: (r.orgName || '').trim(), email: (r.email || '').trim(), roleCode: r.roleCode || 'RAW_SUPPLIER' }))
        .filter(r => r.orgName && r.email);
      if (rows.length === 0) { ctx.say('협력사명과 이메일을 입력해 주세요.'); return; }
      let successCount = 0;
      const created = [];
      for (const row of rows) {
        try {
          created.push(await ctx.sendInvitation(row.orgName, row.email, dppId, row.roleCode));
          successCount++;
        } catch (e) {
          ctx.say((row.orgName) + ' 초대 실패: ' + (e.message || '알 수 없는 오류'));
        }
      }
      if (created.length) {
        ctx.setInvitesData(prev => [...created, ...prev]);
        setState({ inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }] });
      }
      if (successCount > 0) {
        ctx.say(successCount + '건의 초대 메일을 발송했습니다. (유효기간 7일)');
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
        // DPP 식별자를 누르면 "상세"(생애주기/미충족 필드 읽기전용 패널)가 아니라 작성하던
        // 입력 화면으로 되돌아간다 - 예전엔 둘 다 같은 open()이라 이어서 작성할 방법이
        // 없었다(2026-08-15 사용자 피드백: "식별자 ID 누르면 다시 작성하던 로그로 돌아갈
        // 수 있어야"). fieldFormDppId를 이 DPP로 바꾸면 입력 화면 진입 useEffect가
        // GET /me/field-form?dppId=로 기존 값을 그대로 불러온다(FieldFormService.getForm).
        // steel 역할만 실제 입력 화면이 있어서(다른 도메인은 아직 시딩 전) 그 외엔 기존
        // 상세 패널로 폴백한다.
        resume: r === 'steel'
          ? () => setState({ tab: 'input', fieldFormDppId: id })
          : () => setState({ dppOpen: true, dppId: id }),
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
