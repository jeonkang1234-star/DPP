import React from 'react';

/**
 * 협력사 "참여 DPP" 상세 - 담당 문서 제출 + 추출 결과 확인(2026-10-06 강 요청으로 개편).
 *
 * 예전엔 담당 항목 10개를 빈 입력칸으로 먼저 보여주고 문서는 아래에 따로 받아서, 협력사가
 * "우려물질 포함 여부" 같은 걸 O/X로 손으로 고르는 화면이었다. 이 항목들은 영지식증명 대상이
 * 아니라(공개 값) 문서에서 파싱하는 항목이다 - 그래서 순서를 뒤집었다.
 *   1. 문서 제출 : 올리면 서버가 파싱해서 항목을 채운다(분석 중 표시).
 *   2. 추출 결과 확인 : 문서에서 온 값은 "문서에서 추출" 배지로 읽기 전용, 필요하면 수정.
 *      문서에서 못 찾은 항목만 입력칸이 열린다. 예/아니오 항목은 버튼으로 고른다.
 *
 * 값은 전부 partnerVals.js(partnerDetail)가 만든다 - 여기는 마크업만.
 */
const card = { background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' };
const stepNo = { width: '24px', height: '24px', borderRadius: '999px', background: '#0045A9', color: '#fff', fontSize: '12.5px', fontWeight: 700, display: 'inline-grid', placeItems: 'center', flex: 'none' };
const inputStyle = { height: '44px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '11px', fontSize: '14px', background: '#fff', width: '100%', boxSizing: 'border-box' };
const linkBtn = { whiteSpace: 'nowrap', flex: 'none', border: 0, background: 'transparent', color: '#0045A9', fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: 0 };

function seg(active) {
  return {
    flex: 1, height: '44px', borderRadius: '11px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.14)',
    background: active ? 'rgba(0,69,169,.07)' : '#fff', color: active ? '#0045A9' : '#44546F'
  };
}

function FieldRow({ r }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', borderRadius: '13px', border: '1px solid rgba(16,32,64,.08)', background: '#fff', boxShadow: '0 1px 2px rgba(16,32,64,.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#44546F' }}>
          {r.label}{r.unit ? <span style={{ color: '#8494AC', fontWeight: 500 }}> ({r.unit})</span> : null}
          <span style={{ marginLeft: '6px', fontSize: '11px', fontWeight: 500, color: '#9AA8BE' }}>{r.req}</span>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '24px', padding: '0 10px 0 8px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.12), 0 0 0 1px rgba(16,32,64,.06)', fontSize: '11px', fontWeight: 600, color: r.badge.color, whiteSpace: 'nowrap', flex: 'none' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: r.badge.color }}></span>{r.badge.text}
        </span>
      </div>

      {r.showInput ? (
        r.kind === 'boolean' ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" onClick={r.setYes} style={seg(r.boolYes)}>예</button>
            <button type="button" onClick={r.setNo} style={seg(r.boolNo)}>아니오</button>
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <input type={r.kind === 'number' ? 'number' : 'text'} value={r.value} onChange={r.onChange} placeholder={r.kind === 'number' ? '숫자' : ''} style={{ ...inputStyle, paddingRight: r.unit ? '44px' : '14px' }} />
            {r.unit ? <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#8494AC' }}>{r.unit}</span> : null}
          </div>
        )
      ) : (
        <div style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '0 14px', borderRadius: '11px', background: '#F7F9FD', fontSize: '14px', fontWeight: r.display ? 600 : 400, color: r.display ? '#0B1B33' : '#9AA8BE' }}>
          {r.display || '—'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', minHeight: '16px' }}>
        <span style={{ fontSize: '11px', color: r.status === 'missing' ? '#B42318' : '#8494AC' }}>{r.hint}</span>
        {r.canEdit ? <button type="button" onClick={r.startEdit} style={linkBtn}>{r.editLabel}</button> : null}
        {r.canCancel ? <button type="button" onClick={r.cancelEdit} style={{ ...linkBtn, color: '#6B7A93' }}>취소</button> : null}
      </div>
    </div>
  );
}

export default function PartnerAssignedDetail(v) {
  const {
    partnerAssignedBack, partnerAssignedSelectedLabel,
    partnerDocs, partnerDocsEmpty, partnerFieldRows, partnerFieldFilledCount, partnerFieldTotalCount,
    partnerDocFromCount, partnerDirty, partnerUploadBusy, partnerSaveDraft
  } = v;

  const fieldsCard = (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}><span style={stepNo}>{partnerDocsEmpty ? 1 : 2}</span>{partnerDocsEmpty ? '담당 항목 입력' : '추출 결과 확인'}</span>
          {!partnerDocsEmpty ? <span style={{ fontSize: '12.5px', color: '#6B7A93', paddingLeft: '32px' }}>문서에서 추출된 값을 확인하고 제출하세요. 틀린 값은 수정할 수 있습니다.</span> : null}
        </div>
        <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#44546F', whiteSpace: 'nowrap', paddingTop: '3px' }}>{partnerFieldFilledCount} / {partnerFieldTotalCount}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
        {(partnerFieldRows || []).map(r => <FieldRow key={r.key} r={r} />)}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '16px', borderTop: '1px solid rgba(16,32,64,.07)', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12.5px', color: '#8494AC' }}>
          {partnerFieldFilledCount} / {partnerFieldTotalCount}개 입력 완료{partnerDocFromCount ? ` · 문서에서 ${partnerDocFromCount}개 추출` : ''}{partnerDirty ? ' · 제출 안 한 변경 있음' : ''}
        </span>
        <button onClick={partnerSaveDraft} disabled={partnerUploadBusy} style={{ height: '48px', padding: '0 26px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)', opacity: partnerUploadBusy ? 0.6 : 1 }}>제출</button>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <button onClick={partnerAssignedBack} style={{ alignSelf: 'flex-start', border: '0', background: 'transparent', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← 목록으로</button>
      <span style={{ fontSize: '18px', fontWeight: 700 }}>{partnerAssignedSelectedLabel}</span>

      {partnerDocsEmpty ? fieldsCard : (
        // 제조사 DPP 입력 화면과 같은 배치 - 왼쪽 문서, 오른쪽 데이터(2026-10-06 강 요청).
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(0, 1.55fr)', gap: '16px', alignItems: 'start' }}>
          <div style={{ ...card, position: 'sticky', top: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '15px', fontWeight: 600 }}><span style={stepNo}>1</span>담당 문서 제출</span>
              <span style={{ fontSize: '12.5px', color: '#6B7A93', paddingLeft: '32px', lineHeight: 1.55 }}>문서를 올리면 오른쪽 항목이 자동으로 채워집니다.</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(partnerDocs || []).map(d => (
                <div key={d.key} style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px', borderRadius: '13px', background: '#F7F9FD', border: d.busy ? '1.5px solid rgba(0,69,169,.40)' : '1.5px solid rgba(16,32,64,.07)' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 600, flexWrap: 'wrap' }}>{d.label}<span style={{ fontSize: '11px', fontWeight: 500, color: '#8494AC' }}>{d.req}</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#8494AC', overflowWrap: 'anywhere' }}><span style={{ ...d.dot, flex: 'none' }}></span>{d.statusLabel}{d.fileName && !d.busy ? (' · ' + d.fileName) : ''}</span>
                    {d.uploaded && d.extractedLabel && !d.busy ? <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#44546F' }}>{d.extractedLabel}</span> : null}
                  </span>
                  <label htmlFor={d.inputId} style={{ alignSelf: 'stretch', height: '38px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: d.uploaded ? '1px solid rgba(0,69,169,.24)' : '0', borderRadius: '10px', background: d.uploaded ? '#fff' : '#0045A9', color: d.uploaded ? '#0045A9' : '#fff', fontSize: '12.5px', fontWeight: 600, cursor: partnerUploadBusy ? 'default' : 'pointer', whiteSpace: 'nowrap', opacity: partnerUploadBusy && !d.busy ? 0.5 : 1 }}>{d.buttonLabel}</label>
                  <input id={d.inputId} type="file" accept="application/pdf,.pdf" disabled={partnerUploadBusy} onChange={d.onFileChange} style={{ display: 'none' }} />
                </div>
              ))}
            </div>
          </div>
          {fieldsCard}
        </div>
      )}
    </div>
  );
}
