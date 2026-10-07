import {
  isParserField, inputKindOf, optionsFor, zkpVerdictOf, groupBySection,
  TIER_LABEL, DISCLOSURE_LABEL, AUTO_FILL_DOC_NAME, ZKP_CRITERIA
} from './makerVals.js';

function pad2(n) { return String(n).padStart(2, '0'); }
function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

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
    // 상세 화면 제목 위 한 줄 - 제조사 화면의 "철강 도메인 · 필수 필드 N개" 자리.
    partnerAssignedSubLabel: (() => {
      const row = participationRows.find(r => r.dppId === state.partnerAssignedDppId);
      return row ? (row.owner + ' · ' + row.roleLabel + ' 담당') : '';
    })(),
    // ── 담당 항목 상세(2026-10-06 개편, 2026-10-07 제조사 입력 화면과 같은 모양으로) ──
    // 협력사가 담당 문서(SDS·스크랩 매입증빙 등)를 올리면 서버가 파싱해서 항목을 채우고,
    // 협력사는 결과를 확인하고 문서에 없는 항목만 직접 입력한다. 화면은 제조사 DPP 입력과
    // 똑같이 왼쪽 '문서 검증' + 오른쪽 섹션별 입력 폼(components/FieldFormParts.jsx 공용).
    ...partnerDetail()
  };

  function partnerDetail() {
    const docs = df ? (df.documents || []) : [];
    const fields = ff ? (ff.fields || []) : [];
    const codeOptions = ff && ff.codeOptions ? ff.codeOptions : [];
    const uploading = state.partnerUploading || null;
    const unlocked = state.unlockedFields || {};
    const docByType = Object.fromEntries(docs.map(d => [d.docTypeCode, d]));
    const serverValue = Object.fromEntries(fields.map(f => [f.fieldCode, f.value || '']));

    const docTypeFor = code => {
      const t = FIELD_DOC_TYPE(code);
      return t && docByType[t] ? t : null;
    };
    const fieldsOfDoc = docType => fields.filter(f => docTypeFor(f.fieldCode) === docType);
    const inputOf = code => (ffInputs[code] != null ? ffInputs[code] : (serverValue[code] || ''));

    // ── 왼쪽 '문서 검증' 카드 - 제조사 화면 documentSlots와 같은 모양(2026-10-07 강 요청) ──
    const docRows = docs.map(d => {
      const busy = uploading === d.docTypeCode;
      const failed = !busy && (d.status === 'REJECTED' || d.status === 'EXPIRED');
      const stageIdx = busy || d.status === 'PENDING' ? 1
        : (d.status === 'APPROVED' || d.status === 'REJECTED' || d.status === 'EXPIRED') ? 2 : 0;
      const success = stageIdx === 2 && !failed;
      const finalLabel = failed ? (DOC_STATUS_LABEL[d.status] || '반려됨') : '제출 완료';
      const covered = fieldsOfDoc(d.docTypeCode);
      const extracted = covered.filter(f => f.fromDocument && f.value).length;
      const criterionItems = (d.zkpTarget ? (ZKP_CRITERIA[d.docTypeCode] || []) : []).map(c => ({ ...c, failed: false }));
      return {
        key: d.fieldCode, docTypeCode: d.docTypeCode, label: d.labelKo, labelEn: d.labelEn || '',
        req: d.required ? '필수' : '선택',
        laterStage: false, laterLabel: '', laterStyle: null,
        partnerOwned: false, partnerOwnerLabel: '',
        fileName: d.fileName || '',
        statusLabel: busy ? '문서 분석 중…' : (DOC_STATUS_LABEL[d.status] || d.status),
        progressVisible: false, progressPct: 0, progressStage: '',
        dot: ctx.pillDot(busy ? '#E3A008' : (DOC_STATUS_COLOR[d.status] || '#9AA8BE')),
        categoryLabel: d.zkpTarget ? '데이터 검증' : '형식 확인',
        categoryChip: d.zkpTarget ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#6B7A93'),
        criterionItems,
        criterionOpen: !!(state.criteriaOpen && state.criteriaOpen[d.docTypeCode]),
        toggleCriterion: () => setState(s => ({ criteriaOpen: { ...(s.criteriaOpen || {}), [d.docTypeCode]: !(s.criteriaOpen && s.criteriaOpen[d.docTypeCode]) } })),
        // 이 문서가 채우는 담당 항목 중 몇 개가 실제로 문서에서 나왔는지.
        detailLabel: covered.length && stageIdx === 2 ? ('문서에서 자동 입력 ' + extracted + ' / ' + covered.length + '개 항목') : '',
        tileBorderColor: stageIdx === 2 ? (success ? '#12A150' : '#E3A008')
          : stageIdx === 0 ? '#E03B3B' : 'rgba(16,32,64,.07)',
        steps: ['미제출', '검증 중', finalLabel].map((label, i) => ({
          key: i,
          label,
          status: (i < stageIdx || (i === stageIdx && success)) ? 'done'
            : (i === stageIdx && failed) ? 'failed'
            : (i === stageIdx && stageIdx === 1) ? 'active'
            : 'upcoming'
        })),
        inputId: 'partner-doc-upload-' + d.fieldCode,
        accept: 'application/pdf,.pdf',
        disabled: !!uploading,
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
              ? d.labelKo + ' 분석 완료 · ' + newly + '개 항목을 문서에서 채웠습니다. 오른쪽에서 확인해 주세요.'
              : d.labelKo + ' 업로드 완료 · 문서에서 새로 찾은 항목이 없습니다. 비어 있는 항목은 직접 입력해 주세요.');
          } catch (err) {
            ctx.say(err.message || '문서 업로드에 실패했습니다.');
          } finally {
            setState({ partnerUploading: null });
          }
        }
      };
    });

    // ── 오른쪽 입력 카드 - 제조사 화면 fields와 같은 모양(FieldFormBody가 그대로 그린다) ──
    // 문서에서 채워지는 항목을 위로(제조사 화면과 같은 정렬).
    const autoFillableOf = f => !!docTypeFor(f.fieldCode) || isParserField(f);
    const formFields = fields.slice()
      .sort((a, b) => (autoFillableOf(b) ? 1 : 0) - (autoFillableOf(a) ? 1 : 0))
      .map(f => {
        const code = f.fieldCode;
        const value = inputOf(code);
        const saved = serverValue[code] || '';
        const docType = docTypeFor(code);
        const doc = docType ? docByType[docType] : null;
        const docUploaded = !!(doc && doc.status && doc.status !== 'NOT_UPLOADED');
        const isAutoFillable = autoFillableOf(f);
        const docName = doc ? doc.labelKo : (AUTO_FILL_DOC_NAME[code] || '문서');
        // 서버가 "이 값은 문서에서 왔다"고 알려준 값(fromDocument)이고, 아직 손대지 않았을 때만 파싱값이다.
        const fromDoc = !!(f.fromDocument && value && value === saved);
        let sourceLabel;
        if (fromDoc) sourceLabel = '파싱(' + docName + ')';
        else if (value && value !== saved) sourceLabel = '수정됨 · 제출 전';
        else if (value) sourceLabel = '직접 입력됨';
        else if (isAutoFillable && docUploaded) sourceLabel = docName + '에서 찾지 못함 · 직접 입력';
        else if (isAutoFillable) sourceLabel = docName + ' 업로드 시 자동 인식';
        else sourceLabel = '직접 입력 항목';
        // 파싱된 값은 제조사 화면처럼 잠그고 '수정'을 눌러야 고칠 수 있다.
        const locked = fromDoc && !unlocked[code];
        const unit = unitLabel(f.unit);
        return {
          key: code, label: f.labelKo + (unit ? ' (' + unit + ')' : ''),
          labelEn: f.labelEn || '',
          req: f.required ? '필수' : '선택',
          laterStage: false, laterLabel: '', laterStyle: null,
          ph: (f.helpText && f.helpText.length <= 40) ? f.helpText : '',
          value,
          hint: (f.helpText && f.helpText.length > 40) ? f.helpText : '',
          sourceLabel,
          autoFillable: isAutoFillable,
          section: f.section || 'SYSTEM',
          inputKind: inputKindOf(f),
          options: optionsFor(f, codeOptions),
          tier: f.tier || '',
          tierLabel: TIER_LABEL[f.tier] || '',
          tierStyle: ctx.badgeText3d(f.tier === 'T0' ? '#C22B2B' : f.tier === 'T1' ? '#0045A9' : '#6B7A93'),
          basisTip: [f.legalBasis, f.t1Condition ? '발동 조건: ' + f.t1Condition : ''].filter(Boolean).join(' / '),
          disclosureLabel: DISCLOSURE_LABEL[f.disclosureScope] || '',
          ...zkpVerdictOf(f),
          // 미입력=빨간 테두리, 입력됨=초록 테두리(제조사 화면과 동일).
          inputBorderColor: value ? '#12A150' : '#E03B3B',
          locked,
          partnerLockLabel: '',
          unlock: () => setState(s => ({ unlockedFields: { ...(s.unlockedFields || {}), [code]: true } })),
          onChange: e => ctx.setFieldFormInputs(prev => ({ ...prev, [code]: e.target.value }))
        };
      });

    const filled = formFields.filter(r => !!r.value).length;
    const dirty = fields.some(f => inputOf(f.fieldCode) !== (serverValue[f.fieldCode] || ''));
    const dppKey = state.partnerAssignedDppId;
    const submittedAt = state.partnerSubmittedAt && state.partnerSubmittedAt[dppKey];
    return {
      partnerDocs: docRows,
      partnerDocsEmpty: docRows.length === 0,
      partnerFormFields: formFields,
      partnerFieldSections: ff ? groupBySection(formFields, ff.sections, state.openFieldSections, setState) : [],
      partnerFormOpen: state.partnerFormOpen !== false,
      togglePartnerForm: () => setState(s => ({ partnerFormOpen: !(s.partnerFormOpen !== false) })),
      partnerFieldFilledCount: filled,
      partnerFieldTotalCount: formFields.length,
      partnerDirty: dirty,
      partnerLastSavedLabel: dirty ? '제출하지 않은 변경이 있습니다'
        : submittedAt ? ('마지막 제출 ' + submittedAt) : '아직 제출한 이력이 없습니다',
      partnerUploadBusy: !!uploading,
      partnerSaveDraft: async () => {
        if (!ff || !ff.dppId) return;
        try {
          const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
          ctx.setFieldFormData(result);
          ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(x => [x.fieldCode, x.value || ''])));
          setState(s => ({ unlockedFields: {}, partnerSubmittedAt: { ...(s.partnerSubmittedAt || {}), [ff.dppId]: nowStamp() } }));
          ctx.say('제출했습니다.');
        } catch (e) {
          ctx.say(e.message || '저장에 실패했습니다.');
        }
      }
    };
  }
}
