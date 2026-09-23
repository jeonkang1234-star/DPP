/**
 * 파트너(협력사) 계정 전용 뷰모델 - "협력사 초대"를 받아 가입한 조직이 자기가 참여 요청받은
 * DPP 목록을 보고, DPP 하나를 골라 자기 담당 필드만 입력/제출하는 화면.
 *
 * GET /me/field-form(dppId)·POST /me/field-form/draft는 makerVals.js의 철강 입력 폼과
 * 완전히 같은 API를 쓴다 - FieldFormService가 요청자가 DPP 소유 조직인지 참여 협력사인지에
 * 따라 알아서 필드 범위를 다르게 내려주기 때문에(참여 협력사면 자기 role_code 담당
 * 필드만), FE는 어느 dppId로 불렀는지만 다르게 넘기면 된다. 다만 이름 충돌을 피하려고
 * (그리고 "발급"/"배치" 같은 소유 조직 전용 개념이 없어서) fields/fieldCheck 등은
 * partnerFields/partnerFieldCheck처럼 접두어를 붙여 makerVals의 것과 분리한다.
 *
 * @param ctx shared context from useAppLogic
 */
export function partnerVals(ctx) {
  const { state, setState } = ctx;
  const isPartner = state.role === 'partner';
  const ff = isPartner ? ctx.fieldFormData : null;
  const ffInputs = ctx.fieldFormInputs || {};
  const df = isPartner ? ctx.documentFormData : null;
  const DOC_STATUS_LABEL = { NOT_UPLOADED: '미제출', PENDING: '검토 중', APPROVED: '제출 완료', REJECTED: '반려됨', EXPIRED: '만료됨' };
  const DOC_STATUS_COLOR = { NOT_UPLOADED: '#9AA8BE', PENDING: '#E3A008', APPROVED: '#12A150', REJECTED: '#E03B3B', EXPIRED: '#C22B2B' };

  const participationRows = (ctx.participationsData || []).map(p => {
    const roleLabel = { RAW_SUPPLIER: '원자재·화학 공급사', LOGISTICS: '물류사', DISTRIBUTOR: '유통사', RECYCLER: '재활용업체', TEST_LAB: '시험·인증기관' }[p.roleCode] || p.roleCode;
    // 수락 전에는 "입력 대기"가 아니라 "수락 대기"다 - 아직 아무것도 맡지 않은 상태이고,
    // 그 사이 담당 항목은 제조사가 그대로 채울 수 있다(2026-08-23 강 요청).
    const statusLabel = !p.accepted ? '수락 대기'
      : ({ INVITED: '입력 대기', IN_PROGRESS: '작성 중', SUBMITTED: '제출 완료', COMPLETED: '완료' }[p.submitStatus] || p.submitStatus);
    const selected = state.partnerAssignedDppId === p.dppId;
    const filled = (p.myFieldsFilled || 0) + (p.myDocsFilled || 0);
    const total = (p.myFieldsTotal || 0) + (p.myDocsTotal || 0);
    return {
      key: p.dppId, dppId: p.dppId, invitedAt: p.invitedAt || null, label: p.dppLabel, owner: p.ownerOrgName, roleLabel, statusLabel,
      filled, total,
      fieldsFilled: p.myFieldsFilled, fieldsTotal: p.myFieldsTotal,
      docsFilled: p.myDocsFilled, docsTotal: p.myDocsTotal,
      pct: total > 0 ? Math.round((filled / total) * 100) : 0,
      selected,
      cardStyle: {
        flex: 1, minWidth: 0, height: 64, boxSizing: 'border-box', justifyContent: 'center',
        display: 'flex', flexDirection: 'column', gap: 4, padding: '0 18px',
        border: selected ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.08)', borderRadius: 14,
        background: selected ? 'rgba(0,69,169,.04)' : '#fff', cursor: 'pointer', textAlign: 'left'
      },
      statusDot: ctx.pillDot(!p.accepted ? '#9AA8BE' : p.submitStatus === 'SUBMITTED' || p.submitStatus === 'COMPLETED' ? '#12A150' : p.submitStatus === 'IN_PROGRESS' ? '#E3A008' : '#9AA8BE'),
      // 수락 버튼(2026-08-23). 수락해야 이 역할 담당 항목·문서가 우리 것이 되고, 그때부터
      // 제조사 화면에서는 그 칸이 잠긴다. 안내 문구("우리 조직만 제출할 수 있습니다")는
      // 2026-09-23 강 요청으로 목록에서 뺐다 - 수락 전이면 버튼만 남는다.
      accepted: !!p.accepted,
      accept: async () => {
        try {
          const result = await ctx.acceptParticipation(p.dppId);
          ctx.setParticipationsData(result || []);
          ctx.say('참여를 수락했습니다.');
        } catch (e) {
          ctx.say(e.message || '수락에 실패했습니다.');
        }
      },
      open: () => setState({ partnerAssignedDppId: p.dppId })
    };
  });

  // 참여 DPP 목록 정리(2026-09-23 강 요청): 입력 완료된 건은 맨 위 토글로 접어 두고,
  // 나머지(아직 입력할 게 남은 건)만 펼쳐서 보여준다. 정렬은 오래된 순(초대 시각) /
  // 입력률 낮은 순 / 입력률 높은 순. 초대 시각이 없으면(구버전 BE 응답) dppId로 대신한다.
  const partnerSort = state.partnerAssignedSort || 'oldest';
  const invitedTs = r => (r.invitedAt ? Date.parse(r.invitedAt) : NaN);
  const byOldest = (a, b) => {
    const ta = invitedTs(a), tb = invitedTs(b);
    if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta - tb;
    return (a.dppId || 0) - (b.dppId || 0);
  };
  const sorter = partnerSort === 'pctAsc' ? (a, b) => (a.pct - b.pct) || byOldest(a, b)
    : partnerSort === 'pctDesc' ? (a, b) => (b.pct - a.pct) || byOldest(a, b)
    : byOldest;
  const isDone = r => r.total > 0 && r.filled >= r.total;
  const sortedRows = participationRows.slice().sort(sorter);
  const doneRows = sortedRows.filter(isDone);
  const pendingRows = sortedRows.filter(r => !isDone(r));
  const sortPill = active => ({
    height: 30, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.12)',
    background: active ? '#0045A9' : '#fff', color: active ? '#fff' : '#44546F'
  });

  return {
    // "DPP 전체 상세는 안 보이고 본인이 올려야 하는 것만" - myFieldsFilled/Total(입력값)과
    // myDocsFilled/Total(업로드 문서)을 합쳐서 하나의 진행률로 보여준다. 둘 다 백엔드가
    // 이 협력사 role_code 담당 항목만 세서 내려주므로(ParticipationService 참고) DPP
    // 전체 완성도는 여기 전혀 안 섞인다(2026-08-15).
    participations: participationRows,
    participationsEmpty: (ctx.participationsData || []).length === 0,
    participationsPending: pendingRows,
    participationsDone: doneRows,
    participationsDoneCount: doneRows.length,
    participationsPendingEmpty: participationRows.length > 0 && pendingRows.length === 0,
    partnerDoneOpen: !!state.partnerDoneOpen,
    togglePartnerDone: () => setState({ partnerDoneOpen: !state.partnerDoneOpen }),
    partnerSortOptions: [
      { key: 'oldest', label: '오래된 순' },
      { key: 'pctAsc', label: '입력률 낮은 순' },
      { key: 'pctDesc', label: '입력률 높은 순' }
    ].map(o => ({ ...o, style: sortPill(partnerSort === o.key), onClick: () => setState({ partnerAssignedSort: o.key }) })),
    partnerAssignedHasSelection: !!state.partnerAssignedDppId,
    partnerAssignedBack: () => setState({ partnerAssignedDppId: null }),
    partnerAssignedSelectedLabel: (() => {
      const found = (ctx.participationsData || []).find(p => p.dppId === state.partnerAssignedDppId);
      return found ? found.dppLabel : '';
    })(),
    partnerFields: ff
      ? ff.fields.map(f => ({
          key: f.fieldCode, label: f.labelKo + (f.unit ? ' (' + f.unit + ')' : ''),
          req: f.required ? '필수' : '선택', ph: f.helpText || '', value: ffInputs[f.fieldCode] || '',
          hint: f.helpText || '',
          onChange: e => ctx.setFieldFormInputs(prev => ({ ...prev, [f.fieldCode]: e.target.value }))
        }))
      : [],
    partnerFieldFilledCount: ff ? ff.fields.filter(f => !!ffInputs[f.fieldCode]).length : 0,
    partnerFieldTotalCount: ff ? ff.fields.length : 0,
    // 참여 협력사 담당 문서(예: RAW_SUPPLIER의 스크랩 매입증빙) - 백엔드가 자기 role_code
    // 담당 문서만 내려주므로 FE는 필터링 없이 그대로 보여준다.
    partnerDocumentSlots: df
      ? df.documents.map(d => ({
          key: d.fieldCode, label: d.labelKo, labelEn: d.labelEn || '', req: d.required ? '필수' : '선택',
          fileName: d.fileName || '',
          statusLabel: DOC_STATUS_LABEL[d.status] || d.status,
          dot: ctx.pillDot(DOC_STATUS_COLOR[d.status] || '#9AA8BE'),
          inputId: 'partner-doc-upload-' + d.fieldCode,
          onFileChange: async (e) => {
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file || !state.partnerAssignedDppId) return;
            try {
              const result = await ctx.uploadDocument(state.partnerAssignedDppId, d.docTypeCode, file);
              ctx.setDocumentFormData(result);
              ctx.say(d.labelKo + ' 업로드했습니다.');
            } catch (err) {
              ctx.say(err.message || '문서 업로드에 실패했습니다.');
            }
          }
        }))
      : [],
    partnerSaveDraft: async () => {
      if (!ff || !ff.dppId) return;
      try {
        const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
        ctx.setFieldFormData(result);
        ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(f => [f.fieldCode, f.value || ''])));
        ctx.say('제출했습니다.');
      } catch (e) {
        ctx.say(e.message || '저장에 실패했습니다.');
      }
    }
  };
}
