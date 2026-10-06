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
/**
 * 담당 항목 -> 그 값을 담고 있는 담당 문서 유형. 화면에서 "어느 문서를 올리면 채워지는지"를
 * 안내하는 용도다(실제 채움은 서버 파서가 한다 - parser/spec_fields.py + V39).
 * 지금 협력사 담당 문서가 있는 건 RAW_SUPPLIER(철강)뿐이라 그 둘만 적는다. 매칭이 없으면
 * 그 항목은 문서와 무관한 직접 입력 항목으로 그린다.
 */
function FIELD_DOC_TYPE(code) {
  if (/^(SOC_|SVHC_|ROHS_|HEXAVALENT_)/.test(code)) return 'SOC_SDS';
  if (/^(RECYCLED_SCRAP_RATE|SCRAP_SOURCE)$/.test(code)) return 'SCRAP_PROOF';
  return null;
}

/** requirement_field.unit은 V4 시절 코드값(PERCENT 등)이 섞여 있다 - 화면엔 기호로. */
function unitLabel(unit) {
  if (!unit) return '';
  return { PERCENT: '%', KGCO2E_T: 'kgCO₂e/t', TON: 't', KG: 'kg' }[unit] || unit;
}

function displayValue(kind, value, unit) {
  if (!value) return '';
  if (kind === 'boolean') return value === 'true' ? '예' : value === 'false' ? '아니오' : value;
  if (kind === 'number' && unit) return value + ' ' + unit;
  return value;
}

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
    // ── 담당 항목 상세(2026-10-06 개편) ───────────────────────────────────
    // 협력사가 O/X를 손으로 고르는 게 아니라, 담당 문서(SDS·스크랩 매입증빙 등)를 올리면
    // 서버가 파싱해서 항목을 채우고 협력사는 결과를 확인만 한다. 문서에서 못 찾은 항목만
    // 직접 입력한다. 화면 순서도 "1 문서 제출 → 2 추출 결과 확인"으로 바꿨다.
    ...partnerDetail()
  };

  function partnerDetail() {
    const docs = df ? (df.documents || []) : [];
    const fields = ff ? (ff.fields || []) : [];
    const uploading = state.partnerUploading || null;
    const editing = state.partnerEditing || {};
    const docByType = Object.fromEntries(docs.map(d => [d.docTypeCode, d]));
    const serverValue = Object.fromEntries(fields.map(f => [f.fieldCode, f.value || '']));

    const docTypeFor = code => {
      const t = FIELD_DOC_TYPE(code);
      return t && docByType[t] ? t : null;
    };
    const fieldsOfDoc = docType => fields.filter(f => docTypeFor(f.fieldCode) === docType);

    const docRows = docs.map(d => {
      const busy = uploading === d.docTypeCode;
      const covered = fieldsOfDoc(d.docTypeCode);
      const extracted = covered.filter(f => f.fromDocument && f.value).length;
      return {
        key: d.fieldCode, docTypeCode: d.docTypeCode, label: d.labelKo, labelEn: d.labelEn || '',
        req: d.required ? '필수' : '선택',
        uploaded: d.status && d.status !== 'NOT_UPLOADED',
        fileName: d.fileName || '',
        statusLabel: busy ? '문서 분석 중…' : (DOC_STATUS_LABEL[d.status] || d.status),
        dot: ctx.pillDot(busy ? '#0045A9' : (DOC_STATUS_COLOR[d.status] || '#9AA8BE')),
        busy,
        extractedLabel: covered.length ? ('자동 입력 ' + extracted + ' / ' + covered.length) : '',
        inputId: 'partner-doc-upload-' + d.fieldCode,
        buttonLabel: busy ? '분석 중' : (d.status && d.status !== 'NOT_UPLOADED' ? '다시 올리기' : '업로드'),
        onFileChange: async (e) => {
          const file = e.target.files && e.target.files[0];
          e.target.value = '';
          if (!file || !state.partnerAssignedDppId || uploading) return;
          const dppId = state.partnerAssignedDppId;
          const prevInputs = { ...ffInputs };
          setState({ partnerUploading: d.docTypeCode });
          try {
            const result = await ctx.uploadDocument(dppId, d.docTypeCode, file);
            ctx.setDocumentFormData(result);
            const res = await ctx.refreshFieldForm(dppId);
            // refreshFieldForm은 입력값을 서버 값으로 덮는다 - 업로드 전에 사람이 고쳐 놓고
            // 아직 제출 안 한 값은 살리되, 이번 문서에서 값이 나온 항목은 문서 값을 쓴다
            // (2026-10-06: 예전에 손으로 쳐 둔 "3" 같은 미제출 값이 문서 추출값을 가리던 문제).
            const fresh = Object.fromEntries((res ? (res.fields || []) : []).map(x => [x.fieldCode, x.value || '']));
            ctx.setFieldFormInputs(cur => {
              const next = { ...cur };
              Object.keys(prevInputs).forEach(c => {
                const edited = (prevInputs[c] || '') !== (serverValue[c] || '');
                if (edited && !fresh[c]) next[c] = prevInputs[c];
              });
              return next;
            });
            const after = res ? (res.fields || []) : [];
            const newly = after.filter(f => f.value && !serverValue[f.fieldCode]).length;
            ctx.say(newly > 0
              ? d.labelKo + ' 분석 완료 · ' + newly + '개 항목을 문서에서 채웠습니다. 아래에서 확인해 주세요.'
              : d.labelKo + ' 업로드 완료 · 문서에서 새로 찾은 항목이 없습니다. 비어 있는 항목은 직접 입력해 주세요.');
          } catch (err) {
            ctx.say(err.message || '문서 업로드에 실패했습니다.');
          } finally {
            setState({ partnerUploading: null });
          }
        }
      };
    });

    const fieldRows = fields.map(f => {
      const code = f.fieldCode;
      const kind = f.dataType === 'BOOLEAN' ? 'boolean' : f.dataType === 'NUMBER' ? 'number' : 'text';
      const input = ffInputs[code] != null ? ffInputs[code] : (f.value || '');
      const saved = f.value || '';
      const changed = input !== saved;
      const docType = docTypeFor(code);
      const doc = docType ? docByType[docType] : null;
      const docUploaded = !!(doc && doc.status && doc.status !== 'NOT_UPLOADED');
      const isEditing = !!editing[code];
      // 상태: doc(문서에서 추출) / manual(직접 입력) / edited(고쳤지만 미제출) / waiting(문서 대기) / missing(문서에 없음) / empty
      let status;
      if (changed && input) status = 'edited';
      else if (input && f.fromDocument) status = 'doc';
      else if (input) status = 'manual';
      else if (doc && !docUploaded) status = 'waiting';
      else if (doc && docUploaded) status = 'missing';
      else status = 'empty';
      // 배지는 흰 바탕 + 그림자로 띄우고 상태는 글자색(과 점)으로만 구분한다(2026-10-06 강 요청).
      const badge = {
        doc: { text: '문서에서 추출', color: '#0E7A3D' },
        manual: { text: '직접 입력', color: '#44546F' },
        edited: { text: '수정됨 · 제출 전', color: '#B26B00' },
        waiting: { text: '문서 대기', color: '#8494AC' },
        missing: { text: '문서에서 찾지 못함', color: '#C0362C' },
        empty: { text: '입력 필요', color: '#8494AC' }
      }[status];
      const showInput = isEditing || status === 'missing' || status === 'empty';
      const setValue = v => ctx.setFieldFormInputs(prev => ({ ...prev, [code]: v }));
      return {
        key: code, label: f.labelKo, unit: unitLabel(f.unit), req: f.required ? '필수' : '선택', kind,
        status, badge, showInput,
        display: displayValue(kind, input, unitLabel(f.unit)),
        hint: status === 'waiting' ? (doc.labelKo + '를 올리면 자동으로 채워집니다')
          : status === 'missing' ? (doc.labelKo + '에 이 항목이 없습니다. 직접 입력해 주세요.')
          : (status === 'empty' ? (f.helpText || '') : ''),
        value: input,
        boolYes: input === 'true', boolNo: input === 'false',
        setYes: () => setValue('true'), setNo: () => setValue('false'),
        onChange: e => setValue(e.target.value),
        canEdit: !showInput,
        editLabel: status === 'waiting' ? '직접 입력' : '수정',
        startEdit: () => setState(s => ({ partnerEditing: { ...(s.partnerEditing || {}), [code]: true } })),
        cancelEdit: () => {
          setValue(saved);
          setState(s => { const n = { ...(s.partnerEditing || {}) }; delete n[code]; return { partnerEditing: n }; });
        },
        canCancel: isEditing
      };
    });

    const filled = fieldRows.filter(r => !!r.value).length;
    const dirty = fieldRows.some(r => r.status === 'edited') || fieldRows.some(r => r.value && r.value !== (serverValue[r.key] || ''));
    return {
      partnerDocs: docRows,
      partnerDocsEmpty: docRows.length === 0,
      partnerFieldRows: fieldRows,
      partnerFieldFilledCount: filled,
      partnerFieldTotalCount: fieldRows.length,
      partnerDocFromCount: fieldRows.filter(r => r.status === 'doc').length,
      partnerDirty: dirty,
      partnerUploadBusy: !!uploading,
      partnerSaveDraft: async () => {
        if (!ff || !ff.dppId) return;
        try {
          const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
          ctx.setFieldFormData(result);
          ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(x => [x.fieldCode, x.value || ''])));
          setState({ partnerEditing: {} });
          ctx.say('제출했습니다.');
        } catch (e) {
          ctx.say(e.message || '저장에 실패했습니다.');
        }
      }
    };
  }
}
