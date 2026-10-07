import React from 'react';
import { DocumentSlotTile, FieldFormBody } from '../components/FieldFormParts.jsx';

/**
 * 협력사 "참여 DPP" 상세 - 담당 문서 제출 + 담당 항목 입력.
 *
 * 2026-10-07 강 요청: 제조사 DPP 입력 화면(AppView.jsx scInput)과 최대한 똑같이.
 *   - 왼쪽 '문서 검증' 카드 / 오른쪽 입력 카드, 같은 1 : 1.3 배치.
 *   - 문서 타일(업로드 버튼, 미제출→검증 중→제출 완료 단계, 테두리 색)과 입력 폼 본문
 *     (섹션 접기, 문서에서 자동 인식되는 항목 / 직접 입력해야 하는 항목 블록, 빨강/초록
 *     테두리, 법정필수 배지, 파싱값 잠금 + 수정)은 제조사 화면과 같은 컴포넌트를 쓴다
 *     (components/FieldFormParts.jsx).
 *   - 제조사 전용인 제품 사진 등록, "필수 n/m · 선택 n/m 입력됨" 버튼, 발급 버튼은 없다.
 *
 * 값은 전부 partnerVals.js(partnerDetail)가 만든다 - 여기는 마크업만.
 */
export default function PartnerAssignedDetail(v) {
  const {
    partnerAssignedBack, partnerAssignedSelectedLabel, partnerAssignedSubLabel,
    partnerDocs, partnerDocsEmpty, partnerFormFields, partnerFieldSections,
    partnerFormOpen, togglePartnerForm, partnerLastSavedLabel, partnerDirty,
    partnerUploadBusy, partnerSaveDraft
  } = v;

  const formCard = (
    <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: partnerFormOpen ? '18px' : '0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <button onClick={togglePartnerForm} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '0', background: 'transparent', padding: '0', cursor: 'pointer', textAlign: 'left', flex: '1' }}>
          <span style={{ fontSize: '15px', fontWeight: '600' }}>담당 항목 입력</span>
          <span style={{ display: 'inline-block', fontSize: '11px', color: '#8494AC', transform: partnerFormOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>▾</span>
        </button>
      </div>
      {partnerFormOpen ? (<>
      <FieldFormBody fields={partnerFormFields} fieldSections={partnerFieldSections} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(16,32,64,.07)' }}>
        <span style={{ fontSize: '12.5px', color: partnerDirty ? '#B26B00' : '#8494AC' }}>{partnerLastSavedLabel}</span>
        <button onClick={partnerSaveDraft} disabled={partnerUploadBusy} style={{ height: '48px', padding: '0 24px', border: '0', borderRadius: '13px', background: partnerUploadBusy ? '#B7C2D6' : '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: partnerUploadBusy ? 'not-allowed' : 'pointer', boxShadow: partnerUploadBusy ? 'none' : '0 8px 18px rgba(0,69,169,.24)' }}>제출</button>
      </div>
      </>) : null}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <button onClick={partnerAssignedBack} style={{ alignSelf: 'flex-start', border: '0', background: 'transparent', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer', padding: '0' }}>← 목록으로</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
        {partnerAssignedSubLabel ? (<span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>{partnerAssignedSubLabel}</span>) : null}
        <span style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-.02em' }}>{partnerAssignedSelectedLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: partnerDocsEmpty ? '1fr' : '1fr 1.3fr', gap: '16px', alignItems: 'start' }}>
        {!partnerDocsEmpty ? (
        <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: '600' }}>문서 검증</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {(partnerDocs || []).map((d) => (<DocumentSlotTile key={d.key} d={d} />))}
          </div>
        </div>
        ) : null}
        {formCard}
      </div>
    </div>
  );
}
