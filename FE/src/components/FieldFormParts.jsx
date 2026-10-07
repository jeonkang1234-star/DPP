import React from 'react';

/**
 * DPP 입력 폼 공용 조각(2026-10-07 강 요청: 협력사 입력 폼을 제조사 DPP 입력 화면과
 * 최대한 같게). 예전엔 이 마크업이 AppView.jsx의 제조사 입력 화면(scInput) 안에만
 * 인라인으로 있어서 협력사 상세(PartnerAssignedDetail)는 비슷하게 흉내 낸 별도 마크업을
 * 썼다 - 그러다 보니 섹션 접기, 파싱/수기 블록, 빨강/초록 테두리, 법정필수 배지 같은
 * 것들이 두 화면에서 계속 어긋났다. 이제 두 화면이 이 두 컴포넌트를 그대로 같이 쓴다.
 *
 *  - DocumentSlotTile : 왼쪽 '문서 검증' 카드의 문서 한 장(업로드 버튼 + 진행 단계).
 *  - FieldFormBody    : 오른쪽 기본 정보 카드 본문(섹션 → 자동 인식/직접 입력 블록).
 *
 * 값의 모양은 makerVals.js(documentSlots / fields·fieldSections)가 정한다 -
 * partnerVals.js도 같은 모양으로 만들어 넘긴다. 여기는 마크업만.
 */
export function DocumentSlotTile({ d }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '13px 14px', borderRadius: '13px', background: '#F7F9FD', border: '1.5px solid ' + d.tileBorderColor }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', flexWrap: 'wrap' }}>{d.label}<span style={{ fontSize: '11px', fontWeight: '500', color: '#8494AC' }}>{d.req}</span></span>
          {d.labelEn ? (<span style={{ fontSize: '11px', color: '#8494AC' }}>{d.labelEn}</span>) : null}
        </span>
        {/* 협력사 담당 문서는 제조사가 올리는 것이 아니다(2026-08-23 강 리포트).
            업로드 버튼 대신 담당 역할을 보여주고, 항목은 그대로 남겨 제출
            진행 상황을 볼 수 있게 한다. */}
        {d.partnerOwned
          ? (<span style={{ height: '32px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', border: '1px dashed rgba(16,32,64,.20)', borderRadius: '9px', background: '#F2F4F8', color: '#6B7A93', fontSize: '11.5px', fontWeight: '600', whiteSpace: 'nowrap', flex: 'none' }}>{d.partnerOwnerLabel}</span>)
          : (<>
            <label htmlFor={d.inputId} style={{ height: '32px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(0,69,169,.24)', borderRadius: '9px', background: '#fff', color: '#0045A9', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>{d.fileName ? '재업로드' : '업로드'}</label>
            <input id={d.inputId} type="file" accept={d.accept} disabled={d.disabled} onChange={d.onFileChange} style={{ display: 'none' }} />
            </>)}
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        <span style={d.categoryChip}>{d.categoryLabel}</span>
        {/* 발급 이후 단계에 제출하는 문서(재활용 처리 결과 등) - 2026-09-19. */}
        {d.laterStage ? (<span style={d.laterStyle}>{d.laterLabel}</span>) : null}
      </span>
      <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{d.laterStage && !d.fileName ? '발급 이후 단계에서 제출합니다' : (d.fileName || '아직 업로드되지 않았습니다')}</span>
      {d.criterionItems && d.criterionItems.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button type="button" onClick={d.toggleCriterion} style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', padding: '0', cursor: 'pointer', fontSize: '11px', color: '#0045A9', fontWeight: '600' }}>
            <span>검증 기준 {d.criterionOpen ? '숨기기' : '보기'}</span>
            <span style={{ fontSize: '9px', transform: d.criterionOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
          </button>
          {d.criterionOpen ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px 10px', background: '#F7F9FC', borderRadius: '9px' }}>
              {d.criterionItems.map((c, $ci) => (<React.Fragment key={$ci}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: c.failed ? '#E03B3B' : '#6B7A93', fontWeight: c.failed ? '600' : '400' }}>{c.item}</span>
                <span style={{ fontSize: '11px', color: c.failed ? '#E03B3B' : '#2A3A55', fontWeight: '600', fontFamily: '\'JetBrains Mono\',monospace' }}>{c.criterion}</span>
              </div>
              </React.Fragment>))}
            </div>
          ) : null}
        </div>
      ) : null}
      {d.detailLabel ? (<span style={{ fontSize: '11px', color: '#6B7A93' }}>{d.detailLabel}</span>) : null}
      {d.progressVisible ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#96660A', fontWeight: '600' }}><span>{d.progressStage}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace' }}>{d.progressPct}%</span></div>
        <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(227,160,8,.18)', overflow: 'hidden' }}><div style={{ width: d.progressPct + '%', height: '100%', borderRadius: '999px', background: '#E3A008', transition: 'width 1s linear' }}></div></div>
      </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {(d.steps || []).map((s, $stepIndex) => (<React.Fragment key={s.key}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', fontWeight: '600', color: s.status === 'done' ? '#12A150' : s.status === 'active' ? '#E3A008' : s.status === 'failed' ? '#E03B3B' : '#B7C0D1' }}>
          <span
            className={s.status === 'active' ? 'ieum-spin' : undefined}
            style={s.status === 'active'
              ? { width: '8px', height: '8px', borderRadius: '999px', flex: 'none', border: '1.5px solid rgba(227,160,8,.30)', borderTopColor: '#E3A008', background: 'transparent' }
              : { width: '7px', height: '7px', borderRadius: '999px', flex: 'none', background: s.status === 'done' ? '#12A150' : s.status === 'failed' ? '#E03B3B' : '#D8DEE9' }}
          ></span>
          {s.label}
        </span>
        {$stepIndex < d.steps.length - 1 ? <span style={{ width: '10px', height: '1px', background: '#E1E6EF', flex: 'none' }}></span> : null}
        </React.Fragment>))}
      </div>
    </div>
  );
}

export function FieldFormBody({ fields, fieldSections }) {
  // 2026-08-19: 필드가 80 -> 361개가 되면서 화면 구조를 두 단계로 바꿨다.
  //   1단계 섹션(식별자 / 화학 성분 / 탄소·CBAM ...) - 접었다 펼 수 있고,
  //          헤더에 그 섹션의 필수 입력 진행도(3/7)를 붙인다.
  //   2단계 섹션 안에서 파싱/수기 구분 - 예전 화면의 두 블록을 그대로 유지.
  // 예전처럼 파싱/수기 두 덩어리만 두면 각 덩어리가 150줄짜리 벽이 된다.
  // fieldSections가 비어 있으면(구버전 BE, 또는 목데이터 폼 역할) 예전
  // 방식으로 그대로 그린다.
  const renderInput = (f) => {
    const base = { height: '48px', padding: '0 14px', border: '1.5px solid ' + f.inputBorderColor, borderRadius: '12px', fontSize: '14px', background: f.locked ? '#F2F4F8' : '#fff', color: f.locked ? '#6B7A93' : '#0B1B33', cursor: f.locked ? 'not-allowed' : 'text', width: '100%', boxSizing: 'border-box' };
    // 영업비밀(ZKP 대체) 항목은 입력칸을 아예 두지 않는다. 실측값은 저장하지도
    // 표시하지도 않고, 한계값 충족 여부(O/X)만 보여준다(2026-08-20 강 지적).
    if (f.zkpOnly) {
      return (
        <span style={{ ...base, height: 'auto', minHeight: '48px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', background: '#F7F9FD', borderStyle: 'dashed', cursor: 'default' }}>
          <span style={{ width: '26px', height: '26px', flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '999px', background: f.zkpBg, color: f.zkpFg, fontSize: '14px', fontWeight: '800' }}>{f.zkpMark}</span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: f.zkpFg }}>{f.zkpLabel}</span>
            {/* 근거 규정은 길어서 두 줄까지 접힌다 - 잘라내면 어떤 규정인지 못 읽는다. */}
            <span style={{ fontSize: '10.5px', color: '#8494AC', lineHeight: '1.45', wordBreak: 'break-word' }}>{f.zkpHint}</span>
          </span>
        </span>
      );
    }
    if (!f.onChange) {
      return <input placeholder={f.ph} defaultValue={f.value} style={{ ...base, background: '#fff' }} />;
    }
    const onChange = f.locked ? undefined : f.onChange;
    if (f.inputKind === 'select') {
      return (
        <select value={f.value} onChange={onChange} disabled={f.locked} style={base}>
          <option value="">선택하세요</option>
          {(f.options || []).map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      );
    }
    if (f.inputKind === 'boolean') {
      return (
        <select value={f.value} onChange={onChange} disabled={f.locked} style={base}>
          <option value="">선택하세요</option>
          <option value="true">예 / 해당됨</option>
          <option value="false">아니오 / 해당 없음</option>
        </select>
      );
    }
    if (f.inputKind === 'textarea') {
      return <textarea placeholder={f.ph} value={f.value} onChange={onChange} readOnly={f.locked} rows={3} style={{ ...base, height: 'auto', padding: '12px 14px', resize: 'vertical', fontFamily: 'inherit' }} />;
    }
    const type = f.inputKind === 'number' ? 'number'
      : f.inputKind === 'date' ? 'date'
      : f.inputKind === 'datetime' ? 'datetime-local'
      : f.inputKind === 'url' ? 'url' : 'text';
    return <input type={type} placeholder={f.ph} value={f.value} onChange={onChange} readOnly={f.locked} style={base} />;
  };
  const renderField = (f, $index) => (<React.Fragment key={$index}>
    <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '7px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>
          {f.label}{f.req === '필수' ? (<span style={{ color: '#C22B2B' }}>*</span>) : null}
          {f.tierLabel ? (<span title={f.basisTip} style={{ ...f.tierStyle, fontSize: '10px', cursor: f.basisTip ? 'help' : 'default' }}>{f.tierLabel}</span>) : null}
          {f.disclosureLabel ? (<span style={{ fontSize: '10px', color: '#8494AC' }}>· {f.disclosureLabel}</span>) : null}
          {/* 발급 이후 단계에 채우는 항목 - 필수여도 발급을 막지 않는다(2026-09-19). */}
          {f.laterStage ? (<span style={{ ...f.laterStyle, fontSize: '10px' }}>{f.laterLabel}</span>) : null}
        </span>
        {/* 협력사가 수락해서 잠긴 칸은 '수정'으로 풀 수 없다 - 대신 누구를
            기다리는 중인지 보여준다(2026-08-23). */}
        {f.partnerLockLabel
          ? (<span style={{ height: '22px', padding: '0 9px', display: 'inline-flex', alignItems: 'center', border: '1px dashed rgba(16,32,64,.20)', borderRadius: '7px', background: '#F2F4F8', fontSize: '10.5px', fontWeight: '600', color: '#6B7A93', whiteSpace: 'nowrap', flex: 'none' }}>{f.partnerLockLabel}</span>)
          : f.locked && f.unlock ? (<button type="button" onClick={f.unlock} style={{ height: '22px', padding: '0 9px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '7px', background: '#fff', fontSize: '10.5px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', flex: 'none' }}>수정</button>) : null}
      </span>
      {renderInput(f)}
      <span style={{ fontSize: '11px', color: '#8494AC' }}>{f.sourceLabel}</span>
      {/* help_text(작성 요령·표기 규칙). 지금까지 협력사 화면에만 그려져
          있어서, 제조사 입력 화면에서는 서버가 내려준 설명이 아무 데도
          보이지 않았다 - HS 코드 자릿수 설명처럼 값의 형식을 좌우하는
          안내가 묻혔다(2026-08-23 강 요청). */}
      {f.hint ? (<span style={{ fontSize: '11px', color: '#8494AC', lineHeight: '1.55', overflowWrap: 'anywhere' }}>{f.hint}</span>) : null}
    </label>
    </React.Fragment>);
  // 2026-08-18(2차) 강 요청: "파싱되는 데이터랑 그냥 입력하는 데이터랑
  // 블록으로 구분" - 각 그룹을 옅은 배경 + 테두리가 있는 카드형 블록으로
  // 감싼다(파싱=초록 톤, 수기=회색 톤).
  const renderGroups = (parsedFields, manualFields) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {parsedFields.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '14px', background: 'rgba(18,161,80,.05)', border: '1px solid rgba(18,161,80,.18)' }}>
          <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#0E7A3D' }}>문서에서 자동 인식되는 항목</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {parsedFields.map((f, $index) => renderField(f, 'p' + $index))}
          </div>
        </div>
      ) : null}
      {manualFields.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '14px', borderRadius: '14px', background: 'rgba(132,148,172,.05)', border: '1px solid rgba(132,148,172,.18)' }}>
          {parsedFields.length ? (<span style={{ fontSize: '11.5px', fontWeight: '600', color: '#6B7A93' }}>직접 입력해야 하는 항목</span>) : null}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {manualFields.map((f, $index) => renderField(f, 'm' + $index))}
          </div>
        </div>
      ) : null}
    </div>
  );
  if (!fieldSections || !fieldSections.length) {
    return renderGroups((fields || []).filter(f => f.autoFillable), (fields || []).filter(f => !f.autoFillable));
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {fieldSections.map((sec) => (
        <div key={sec.key} style={{ border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', overflow: 'hidden' }}>
          <button type="button" onClick={sec.toggle} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', padding: '12px 14px', border: '0', background: sec.open ? '#F7F9FD' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: sec.progressColor, flex: 'none' }}></span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1B33' }}>{sec.label}</span>
              <span style={{ fontSize: '11px', color: '#8494AC' }}>{sec.total}개 항목</span>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {sec.requiredCount ? (<span style={{ fontSize: '11.5px', fontWeight: '600', color: sec.progressColor }}>필수 {sec.filledRequiredCount}/{sec.requiredCount}</span>) : null}
              <span style={{ fontSize: '11px', color: '#8494AC', transform: sec.open ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>▾</span>
            </span>
          </button>
          {sec.open ? (<div style={{ padding: '4px 14px 14px' }}>{renderGroups(sec.parsed, sec.manual)}</div>) : null}
        </div>
      ))}
    </div>
  );
}
