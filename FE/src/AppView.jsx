import React from 'react';
import AppHeader from './components/AppHeader.jsx';
import MyPage from './screens/MyPage.jsx';
import './hover.css';

/**
 * Presentational layer for the whole IEUM DPP prototype.
 * Every value it renders comes from useAppLogic() — this file is markup only.
 */
export default function AppView(v) {
  const {
    anchorBars,
    adminAnchorStatusLabel,
    adminLastAnchoredLabel,
    adminLastAnchorBlockLabel,
    adminAnchorSuccessLabel,
    adminTotalUsersLabel,
    adminUserBreakdownLabel,
    adminTotalDppsLabel,
    adminDppBreakdownLabel,
    adminPendingCountLabel,
    adminPendingBadge,
    adminRefreshedAtLabel,
    membersEmpty,
    apTabs,
    apEmpty,
    approvals,
    auditLog,
    backToScans,
    batchBtn,
    cCeFail,
    cCeNote,
    cCeOk,
    cChecks,
    cDeclared,
    cDoc,
    cDownloadAll,
    showQr,
    cQueueEmpty,
    cQueueRows,
    cCanDecide,
    cApprove,
    cHold,
    cReject,
    cEori,
    cExporter,
    cHs,
    cHsName,
    cId,
    cImporter,
    cImporterAddr,
    cName,
    cNoResult,
    cQty,
    cQuery,
    cRecent,
    cResultMode,
    cSearchMode,
    cTech,
    cVerdict,
    cVerdictDot,
    cVerdictStyle,
    cVerdictTextStyle,
    cancelProfileEdit,
    careItems,
    closeDocPreview,
    closeDpp,
    closeFieldCheck,
    closeNotif,
    commitProfileEdit,
    completeness,
    confirmBody,
    confirmCancel,
    confirmLabel,
    confirmOpen,
    confirmRun,
    confirmStyle,
    confirmTitle,
    disposalItems,
    doLogin,
    fieldFormOpen,
    toggleFieldForm,
    docPreviewChip,
    docPreviewMeta,
    docPreviewName,
    docPreviewOpen,
    docPreviewStatus,
    domainChip,
    domainLabel,
    downloadDoc,
    dppId,
    dppMissingCount,
    dppName,
    dppOpen,
    dppPct,
    dppSpec,
    dppStatusChip,
    dppCanRequestClearance,
    openClearanceRequest,
    closeClearanceRequest,
    crOpen,
    crImportCountryCode,
    onCrImportCountryCode,
    crImporterName,
    onCrImporterName,
    crImporterAddress,
    onCrImporterAddress,
    crImporterEori,
    onCrImporterEori,
    crDeclaredHsCode,
    onCrDeclaredHsCode,
    submitClearanceRequest,
    ecoCarbon,
    ecoCarbonUnit,
    ecoRecycled,
    ecoRecycledBar,
    ecoWater,
    ecoWaterUnit,
    editBiz,
    editBizReadOnly,
    editName,
    editPhone,
    editUrl,
    fieldCheck,
    fieldCheckOpen,
    openFieldCheck,
    fieldCount,
    fieldFilledCount,
    fieldTotalCount,
    fields,
    fieldSections,
    documentSlots,
    documentSlotsEmpty,
    partnerDocumentSlots,
    formTitle,
    dppTitle, onDppTitle, dppTitlePlaceholder,
    goApprove,
    goInput,
    goLogin,
    goSignup,
    hazardNote,
    hazardRisk,
    hazardSafe,
    inputTitle,
    inquiries, inquiriesEmpty, inquiryTotalLabel,
    addInviteRow,
    inviteRows,
    inviteRoleOptions,
    inviteSendLabel,
    invitePending,
    invitesEmpty,
    inviteRejected,
    inviteTotal,
    invites,
    partnerDpps,
    partnerDppsEmpty,
    partnersHasSelection,
    partnersSelectedDppName,
    participations,
    participationsEmpty,
    partnerAssignedHasSelection,
    partnerAssignedBack,
    partnerAssignedSelectedLabel,
    partnerFields,
    partnerFieldFilledCount,
    partnerFieldTotalCount,
    partnerSaveDraft,
    scPartnerAssigned,
    isApp,
    isBatch,
    batchIssueEnabled,
    isLogin,
    isSignup,
    issueDpp,
    issueLabel,
    kpiAvg,
    kpiAvgBar,
    kpiIncomplete,
    kpiMissing,
    kpiNew,
    kpiNewBadgeStyle,
    kpiActionBadgeStyle,
    kpiTotal,
    kpiWaiting,
    lifecycle,
    loginCompanyTab,
    loginEmail,
    loginIsCompany,
    loginIsPersonal,
    loginPassword,
    loginPersonalTab,
    manualName,
    members,
    missingFields,
    myPerms,
    myTier,
    myTierDesc,
    myTierName,
    notifCats, notifCatsVisible,
    notifEmpty,
    notifOpen,
    notifications,
    notifUnreadCount,
    obBars,
    obBatteryCard,
    obC2,
    obC4,
    obClose,
    obComplete,
    obDocs,
    obDomainLabel,
    obG1,
    obG3,
    obGovBanner,
    obGovBannerText,
    obGovCodeSample,
    obGovIdLabel,
    obGovIdPlaceholder,
    obGovOrgPlaceholder,
    obIncomplete,
    obIs1,
    obIs2,
    obIs3,
    obIs4,
    obIs5,
    obLastStep,
    obM2,
    obM4,
    obNext,
    obNextLabel,
    obOpen,
    obPermList,
    obPickBattery,
    obPickSteel,
    obPickTextile,
    obPrev,
    obResume,
    obReview,
    obSavedBar,
    obSavedPct,
    obSavedStep,
    obSavedTitle,
    obSteelCard,
    obStep,
    obTextileCard,
    obTier1,
    obTier1Card,
    obTier2,
    obTier2Card,
    obTier3,
    obTier3Card,
    obTierLabel,
    obTierSub,
    obTitle,
    onCustomsQuery,
    onEditBiz,
    onEditName,
    onEditPhone,
    onEditUrl,
    onLoginEmail,
    onLoginPassword,
    onSuBizRegCert,
    onSuBizRegNo,
    onSuCompanyName,
    onSuCountry,
    onSuEmail,
    onSuPassword,
    onSuPasswordConfirm,
    onSuVerifyCode,
    openManual,
    openNotif,
    openProfileEdit,
    openTakeback,
    openVideo,
    partItems,
    passportBatch,
    passportBrand,
    passportExpired,
    passportGtin,
    passportId,
    passportMade,
    passportModel,
    passportName,
    passportOrigin,
    passportValid,
    pickCustoms,
    pickEu,
    pickMaker,
    pickPartner,
    products,
    profileBiz,
    profileEditOpen,
    profileName,
    profilePhone,
    zkpPendingCount,
    zkpRejectedCount,
    profileUrl,
    refreshCaptcha,
    registry,
    euQuery,
    onEuQueryChange,
    repairBar,
    repairColorStyle,
    repairScore,
    repairVerdict,
    requestPerm,
    requestTier,
    resetCustomsSearch,
    runCustomsSearch,
    saveDraft,
    resetSession,
    scAdminDash,
    scApprove,
    scAudit,
    scClearance,
    scInput,
    scMakerDash,
    scMy,
    scPartners,
    scPassport,
    scPersonalMy,
    scProducts,
    scRegistry,
    scScans,
    scans,
    scansEmpty,
    searchRegistry,
    sendInvite,
    setBatch,
    setCompany,
    setPersonal,
    setSingle,
    setSuCompany,
    setSuPersonal,
    showTabs,
    singleBtn,
    snsLogin,
    suBizRegCertName,
    suBizRegNo,
    suCompanyName,
    suCompanyTab,
    suConfirmCode,
    suCountry,
    suCodeSent,
    suDetectedLabel,
    suDetectedNote,
    suDetectedPersonal,
    suDetectedShow,
    suDetectedUnknown,
    suEmail,
    suIsCompany,
    suIsPersonal,
    suPassword,
    suPasswordConfirm,
    suPersonalTab,
    suPhone,
    suPhoneCodeSent,
    suPhoneVerified,
    suPhoneVerifyCode,
    onSuPhone,
    onSuPhoneVerifyCode,
    suRequestCode,
    suRequestPhoneCode,
    suConfirmPhoneCode,
    suRoleCustoms,
    suRoleEu,
    suRoleIsPublicAuthority,
    suRoleMaker,
    suRolePartner,
    suVerified,
    suVerifyCode,
    submitSignup,
    tabs,
    takebackName,
    tier1Chip,
    tier2Chip,
    tier3Chip,
    toast,
    userInitial,
    userName,
    userRole,
    workspace,
    // --- DPP 발급 게이팅 / QR 발급·조회 / Tier·권한 신청 (2026-08-17 추가) ---
    issueReady,
    issueDisabledHint,
    lastSavedLabel,
    qrModalOpen,
    qrModalId,
    qrModalImg,
    qrModalShowLink,
    qrModalBadge,
    qrModalTitle,
    qrModalHint,
    qrModalUrl, qrModalUrlWarning,
    memberModalOpen, memberModalName, memberModalRows, closeMemberModal,
    qrBaseEditing, qrBaseInput, qrBaseOnChange, openQrBaseEditor, cancelQrBaseEditor, saveQrBase,
    closeQrModal,
    goToProductsFromQr,
    tierRequestPending,
    permRequestPending,
    passportNotFound,
    passportBasic,
    basicStatus,
    basicMaterialLabel,
    basicFields,
    // --- 제조사 대시보드 개편 / 회원관리 반려 팝업 / 제품조회 필터·QR (2026-08-17 추가) ---
    recentDpps,
    recentDppsEmpty,
    esprUpdate,
    rejectModalOpen,
    rejectModalName,
    rejectReasonInput,
    setRejectReasonInput,
    closeRejectModal,
    confirmReject,
    rejectReasonPresets,
    productStatusFilter,
    setProductStatusFilter,
    productFilterTabs,
    dppDetailQrImg,
    dppDetailQrPending,
    dppTitleOpen, toggleDppTitle, dppTitleUnset
  } = v;

  return (
    <>


      <div style={{ width: '1440px', margin: '0 auto', position: 'relative', minHeight: '900px', background: '#FFFFFF' }}>

      {isLogin ? (<>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '900px' }}>
        <div style={{ padding: '64px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0045A9', color: '#fff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '46px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: '#fff', borderRadius: '10px', padding: '9px 13px', display: 'flex' }}><img src="/logo-ieum.png" alt="IEUM" style={{ height: '20px', display: 'block' }} /></div>
              <span style={{ fontSize: '13px', letterSpacing: '.16em', color: 'rgba(255,255,255,.72)', fontWeight: '600' }}>DIGITAL PRODUCT PASSPORT SERVICE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ margin: '0', fontSize: '46px', lineHeight: '1.24', fontWeight: '700', letterSpacing: '-.03em', textWrap: 'pretty' }}>제품의 전 생애주기를<br />하나의 여권으로 잇습니다</h1>
              <p style={{ margin: '0', maxWidth: '430px', fontSize: '16px', lineHeight: '1.7', color: 'rgba(255,255,255,.78)', textWrap: 'pretty' }}>EU ESPR 규정에 대응하는 디지털 제품 여권 발급·검증 플랫폼. <br />원자재부터 재활용까지의 데이터를 블록체인에 앵커링하고, <br />영업기밀은 ZKP로 보호합니다.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto max-content', gap: '1px', background: 'rgba(255,255,255,.16)', borderRadius: '14px', overflow: 'hidden', width: 'fit-content' }}>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', lineHeight: '1' }}>48,392</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>발급된 DPP</span></div>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', lineHeight: '1' }}>1,284</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>참여 기업</span></div>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontSize: '16px', fontWeight: '700', lineHeight: '1', whiteSpace: 'nowrap' }}>철강 · 배터리 · 섬유·패션</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>대응 도메인</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 72px' }}>
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-.02em' }}>로그인</h2>
              <p style={{ margin: '0', fontSize: '14px', color: '#6B7A93' }}>계정 유형을 선택하고 로그인하세요.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px' }}>
              <button onClick={setPersonal} style={loginPersonalTab}>개인</button>
              <button onClick={setCompany} style={loginCompanyTab}>기업</button>
            </div>

            {loginIsPersonal ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => snsLogin('kakao')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#FEE500', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv0"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>카카오로 로그인</button>
              <button onClick={() => snsLogin('naver')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#03C75A', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv1"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M4 3h5.4l5.1 7.6V3H20v18h-5.4L9.5 13.4V21H4V3Z" /></svg></span>네이버로 로그인</button>
              <button onClick={() => snsLogin('google')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '14px', background: '#fff', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv2"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 48 48" width="21" height="21" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6Z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.4 15.4 46 24 46Z" /><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.5Z" /><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.6 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9Z" /></svg></span>구글로 로그인</button>
              <p style={{ margin: '6px 0 0', fontSize: '12.5px', lineHeight: '1.6', color: '#8494AC' }}>개인 회원은 QR로 스캔한 제품의 DPP 열람 이력을 관리할 수 있습니다.</p>
            </div>
            </>) : null}

            {loginIsCompany ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>기업 이메일 (ID)</span><input type="email" value={loginEmail} onChange={onLoginEmail} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', fontSize: '14.5px', color: '#0B1B33' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호</span><input type="password" value={loginPassword} onChange={onLoginPassword} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', fontSize: '14.5px' }} /></label>
            </div>
            </>) : null}

            {loginIsCompany ? (<>
            <button onClick={doLogin} style={{ height: '54px', border: '0', borderRadius: '14px', background: '#0045A9', color: '#fff', fontSize: '15.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.28)' }} className="hv4">로그인</button>
            </>) : null}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', color: '#6B7A93' }}>
              아직 계정이 없으신가요?
              <button onClick={goSignup} style={{ border: '0', background: 'transparent', padding: '0', fontSize: '13px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>회원가입</button>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {isSignup ? (<>
      <div style={{ minHeight: '900px', padding: '44px 0 72px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><img src="/logo-ieum.png" alt="IEUM" style={{ height: '18px', display: 'block' }} /><span style={{ fontSize: '12px', letterSpacing: '.14em', color: '#6B7A93', fontWeight: '600' }}>DPP PLATFORM</span></div>
            <button onClick={goLogin} style={{ border: '1px solid rgba(16,32,64,.12)', background: '#fff', borderRadius: '11px', height: '38px', padding: '0 14px', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv5">로그인으로 돌아가기</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ margin: '0', fontSize: '28px', fontWeight: '700', letterSpacing: '-.02em' }}>회원가입</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', width: '320px', margin: '0 auto' }}>
            <button onClick={setSuPersonal} style={suPersonalTab}>개인</button>
            <button onClick={setSuCompany} style={suCompanyTab}>기업</button>
          </div>

          {suIsPersonal ? (<>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '32px 34px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '460px', width: '100%', margin: '0 auto' }}>
            <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>SNS 계정으로 3초 만에 가입</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={() => snsLogin('kakao')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#FEE500', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>카카오로 가입</button>
              <button onClick={() => snsLogin('naver')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#03C75A', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M4 3h5.4l5.1 7.6V3H20v18h-5.4L9.5 13.4V21H4V3Z" /></svg></span>네이버로 가입</button>
              <button onClick={() => snsLogin('google')} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '14px', background: '#fff', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 48 48" width="21" height="21" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6Z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.4 15.4 46 24 46Z" /><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.5Z" /><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.6 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9Z" /></svg></span>구글로 가입</button>
            </div>
          </div>
          </>) : null}

          {suIsCompany ? (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,760px)', gap: '20px', alignItems: 'start', justifyContent: 'center' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0B1B33' }}>계정 유형 <span style={{ fontWeight: '500', color: '#8494AC' }}>· 등록된 도메인이면 자동 선택, 아니면 직접 선택</span></span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                  <button onClick={pickMaker} style={suRoleMaker}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>제조사</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>DPP 등록·발급</span></button>
                  <button onClick={pickPartner} style={suRolePartner}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>협력사</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>원자재공급 등 제출</span></button>
                  <button onClick={pickCustoms} style={suRoleCustoms}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>세관</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>통관 적법성 검증</span></button>
                  <button onClick={pickEu} style={suRoleEu}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>시장감독기관</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>감사·레지스트리</span></button>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(16,32,64,.07)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사용할 ID (기업 이메일)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input type="email" value={suEmail} onChange={onSuEmail} placeholder="name@company.co.kr" disabled={suVerified} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                    <button onClick={suRequestCode} disabled={suVerified} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{suCodeSent ? '재발송' : '이메일 인증'}</button>
                  </div>
                  {suCodeSent && !suVerified ? (<>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input inputMode="numeric" value={suVerifyCode} onChange={onSuVerifyCode} placeholder="6자리 인증번호" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                    <button onClick={suConfirmCode} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(18,161,80,.24)', borderRadius: '12px', background: 'rgba(18,161,80,.06)', color: '#0E7A3D', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>확인</button>
                  </div>
                  </>) : null}
                  {suVerified ? (<>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#0E7A3D' }}>이메일 인증이 완료되었습니다.</span>
                  </>) : null}
                  {suDetectedShow ? (<>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(0,69,169,.05)', border: '1px solid rgba(0,69,169,.18)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', flex: 'none', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#0045A9' }}></span><span style={{ fontSize: '12px', fontWeight: '700', color: '#0045A9' }}>{suDetectedLabel}</span></span>
                    <span style={{ fontSize: '12px', lineHeight: '1.55', color: '#44546F' }}>{suDetectedNote} · 관리자 승인으로 확정됩니다</span>
                  </div>
                  </>) : null}
                  {suDetectedUnknown ? (<>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(227,160,8,.08)', border: '1px solid rgba(227,160,8,.28)' }}>
                    <span style={{ width: '8px', height: '8px', flex: 'none', borderRadius: '999px', background: '#E3A008' }}></span>
                    <span style={{ fontSize: '12px', lineHeight: '1.55', color: '#44546F' }}>등록되지 않은 도메인입니다. 계정 유형을 직접 선택하고, 다음 단계에서 기관 지정 공문 또는 사업자등록증을 제출하면 관리자가 확인 후 승인합니다.</span>
                  </div>
                  </>) : null}
                  {suDetectedPersonal ? (<>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#C22B2B' }}>개인 메일 도메인(gmail, naver 등)은 기업 회원가입에 사용할 수 없습니다.</span>
                  </>) : null}
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>도메인은 유형을 제안할 뿐이며, 최종 유형은 관리자 승인 시 확정됩니다.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>회사명</span><input value={suCompanyName} onChange={onSuCompanyName} placeholder="대성제강" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사업자등록번호</span><input value={suBizRegNo} onChange={onSuBizRegNo} placeholder="123-45-67890" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>국가</span><input value={suCountry} onChange={onSuCountry} placeholder="대한민국" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호</span><input type="password" value={suPassword} onChange={onSuPassword} placeholder="8자 이상" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호 확인</span><input type="password" value={suPasswordConfirm} onChange={onSuPasswordConfirm} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>
                    사업자등록증{suRoleIsPublicAuthority ? ' (선택)' : ''}
                  </span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '50px', padding: '0 15px', border: '1px dashed rgba(16,32,64,.22)', borderRadius: '12px', fontSize: '13.5px', color: '#44546F', cursor: 'pointer', background: '#FAFBFD' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '30px', padding: '0 12px', borderRadius: '9px', background: 'rgba(0,69,169,.08)', color: '#0045A9', fontSize: '12px', fontWeight: '600', flex: 'none' }}>파일 선택</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suBizRegCertName || 'PDF/이미지 파일을 첨부해 주세요'}</span>
                    <input type="file" accept=".pdf,image/*" onChange={onSuBizRegCert} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>
                    {suRoleIsPublicAuthority
                      ? '세관·시장감독기관 계정은 관리자 수동 심사로만 승인되며, 첨부는 참고용입니다.'
                      : '문서에서 사업자등록번호·상호를 자동으로 확인해 가입 입력값과 완전히 일치할 때만 즉시 승인됩니다. 일치하지 않으면 관리자 수동 심사로 넘어갑니다.'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>전화번호 인증</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input inputMode="tel" value={suPhone} onChange={onSuPhone} placeholder="01012345678" disabled={suPhoneVerified} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px', fontFamily: '\'JetBrains Mono\',monospace' }} />
                    <button onClick={suRequestPhoneCode} disabled={suPhoneVerified} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>{suPhoneCodeSent ? '재발송' : '인증번호 발송'}</button>
                  </div>
                  {suPhoneCodeSent && !suPhoneVerified ? (<>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input inputMode="numeric" value={suPhoneVerifyCode} onChange={onSuPhoneVerifyCode} placeholder="6자리 인증번호" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                    <button onClick={suConfirmPhoneCode} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(18,161,80,.24)', borderRadius: '12px', background: 'rgba(18,161,80,.06)', color: '#0E7A3D', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>확인</button>
                  </div>
                  </>) : null}
                  {suPhoneVerified ? (<>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#0E7A3D' }}>전화번호 인증이 완료되었습니다.</span>
                  </>) : null}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>자동입력 방지</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '190px auto 1fr', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', height: '56px', borderRadius: '12px', overflow: 'hidden', background: '#EEF2F9', border: '1px solid rgba(16,32,64,.14)', display: 'grid', placeItems: 'center' }}>
                      <svg viewBox="0 0 190 56" width="190" height="56" role="img" aria-label="캡차 이미지" style={{ display: 'block' }}>
                        <rect width="190" height="56" fill="#EEF2F9" />
                        <path d="M-5 14 Q40 4 95 18 T195 10" stroke="rgba(11,27,51,.20)" strokeWidth="1.6" fill="none" />
                        <path d="M-5 34 Q50 50 100 30 T195 44" stroke="rgba(0,69,169,.22)" strokeWidth="1.6" fill="none" />
                        <path d="M-5 48 Q60 30 120 46 T195 26" stroke="rgba(11,27,51,.14)" strokeWidth="1.4" fill="none" />
                        <circle cx="30" cy="44" r="1.6" fill="rgba(11,27,51,.22)" />
                        <circle cx="88" cy="12" r="1.4" fill="rgba(11,27,51,.20)" />
                        <circle cx="150" cy="38" r="1.5" fill="rgba(11,27,51,.18)" />
                        <circle cx="118" cy="50" r="1.3" fill="rgba(11,27,51,.16)" />
                        <g fill="#20304C" fontFamily="Georgia, 'Times New Roman', serif" fontSize="30" fontWeight="700">
                          <text x="18" y="40" transform="rotate(-14 18 40) skewX(-8)">k</text>
                          <text x="46" y="42" transform="rotate(11 46 42) skewX(6)">7</text>
                          <text x="74" y="38" transform="rotate(-7 74 38) skewX(-12)">Q</text>
                          <text x="106" y="43" transform="rotate(17 106 43)">2</text>
                          <text x="132" y="37" transform="rotate(-12 132 37) skewX(9)">m</text>
                          <text x="162" y="41" transform="rotate(6 162 41) skewX(-6)">9</text>
                        </g>
                        <path d="M8 30 Q95 44 182 24" stroke="rgba(11,27,51,.38)" strokeWidth="1.8" fill="none" />
                      </svg>
                    </div>
                    <button onClick={refreshCaptcha} title="다른 이미지 보기" style={{ width: '50px', height: '56px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', color: '#44546F', cursor: 'pointer' }} className="hv6"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M10 3.2a6.8 6.8 0 0 0-6.2 4l1.7.7A5 5 0 0 1 10 5a4.9 4.9 0 0 1 4.1 2.2h-2.3v1.8h5V4h-1.8v1.7A6.8 6.8 0 0 0 10 3.2Zm-6.8 8v5h1.8v-1.7A6.8 6.8 0 0 0 16.4 12.8l-1.7-.7A5 5 0 0 1 10 15a4.9 4.9 0 0 1-4.1-2.2h2.3V11h-5Z" /></svg></button>
                    <input placeholder="위 문자를 입력하세요" style={{ height: '56px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>대소문자를 구분하지 않습니다. 잘 보이지 않으면 새로고침 버튼을 누르세요.</span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(16,32,64,.07)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '12px', lineHeight: '1.6', color: '#44546F', cursor: 'pointer', maxWidth: '420px' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: '#0045A9' }} />서비스 이용약관 및 개인정보 처리방침, DPP 데이터 제공 정책에 동의합니다.</label>
                <button onClick={submitSignup} style={{ height: '52px', padding: '0 30px', border: '0', borderRadius: '14px', background: '#0045A9', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)', whiteSpace: 'nowrap' }}>가입 신청</button>
              </div>
            </div>

          </div>
          </>) : null}
        </div>
      </div>
      </>) : null}

      {isApp ? (<>
      <div style={{ padding: '22px 40px 96px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <AppHeader
          workspace={workspace} domainChip={domainChip} domainLabel={domainLabel}
          showTabs={showTabs} tabs={tabs}
          openNotif={openNotif}
          userInitial={userInitial} userName={userName} userRole={userRole}
          resetSession={resetSession}
        />

        {scAdminDash ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>운영 대시보드</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '560px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="회사명으로 회원 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <span style={{ height: '36px', padding: '0 16px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: '#F2F6FC', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600' }}>검색</span>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#8494AC' }}>{adminRefreshedAtLabel}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>전체 가입자 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em', lineHeight: '1' }}>{adminTotalUsersLabel}</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>{adminUserBreakdownLabel}</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>등록 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em', lineHeight: '1' }}>{adminTotalDppsLabel}</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>{adminDppBreakdownLabel}</span>
            </div>
            <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '20px 22px', color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '8px', height: '8px', borderRadius: '5px', background: adminAnchorStatusLabel === '정상' ? '#4ADE80' : '#8494AC', boxShadow: adminAnchorStatusLabel === '정상' ? '0 0 0 4px rgba(74,222,128,.20)' : 'none' }}></span><span style={{ fontSize: '14px', fontWeight: '600' }}>블록체인 앵커 상태</span><span style={{ padding: '3px 9px', borderRadius: '8px', background: adminAnchorStatusLabel === '정상' ? 'rgba(74,222,128,.16)' : 'rgba(255,255,255,.16)', color: adminAnchorStatusLabel === '정상' ? '#86EFAC' : 'rgba(255,255,255,.8)', fontSize: '11.5px', fontWeight: '700' }}>{adminAnchorStatusLabel}</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: '22px', justifyContent: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>{adminLastAnchoredLabel}</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>최근 앵커링</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>{adminLastAnchorBlockLabel}</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>블록 높이</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>{adminAnchorSuccessLabel}</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>30일 성공률</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
                {(anchorBars || []).map((b, $index) => (<React.Fragment key={$index}><span style={b.style}></span></React.Fragment>))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>운영현황</span><span style={{ fontSize: '12px', color: '#8494AC' }}>{adminPendingCountLabel}</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={goApprove} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '14px', padding: '16px 18px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv8">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>가입 승인 대기</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>증빙서류 검토 후 승인 필요</span></span>
                  <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', color: '#0045A9' }}>{adminPendingBadge}</span>
                  <span style={{ fontSize: '12px', color: '#8494AC' }}>→</span>
                </button>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>유형별 문의</span></div>
                <span style={{ height: '32px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>{inquiryTotalLabel}</span>
              </div>
              {inquiriesEmpty ? (
              <div style={{ padding: '30px 0', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>접수된 문의가 없습니다.</div>
              ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(inquiries || []).map((q, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><span style={{ fontSize: '13px', fontWeight: '500', color: '#44546F' }}>{q.label}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', fontWeight: '600', color: '#0B1B33' }}>{q.count}건 · {q.pct}%</span></div>
                  <div style={{ height: '9px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={q.style}></span></div>
                </div>
                </React.Fragment>))}
              </div>
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>회원 관리</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '280px', height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px' }}><span style={{ width: '12px', height: '12px', border: '1.8px solid #9AA8BE', borderRadius: '7px', flex: 'none' }}></span><input placeholder="회사명 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '13.5px' }} /></div>
                <button style={{ height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv11">도메인 전체</button>
                <button style={{ height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv12">국가 전체</button>
              </div>
            </div>
            {membersEmpty ? (<>
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>승인된 회원이 없습니다.</div>
            </>) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr .9fr .9fr 64px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>회사명</span><span>가입시기</span><span>국가</span><span>도메인</span><span style={{ textAlign: 'right' }}>보유 DPP</span><span style={{ textAlign: 'right' }}>발행 DPP</span><span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(members || []).map((m, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr .9fr .9fr 64px', gap: '12px', padding: '0 14px', height: '56px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={m.avatar}>{m.initial}</span><span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.3' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{m.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{m.biz}</span></span></span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{m.joined}</span>
                <span style={{ fontSize: '13px', color: '#44546F' }}>{m.country}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content', height: '30px', padding: '0 13px 0 11px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={m.domainDot}></span><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#2A3A55' }}>{m.domain}</span></span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>{m.held}</span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>{m.issued}</span>
                <button onClick={m.view} style={{ width: '100%', height: '32px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv13">상세</button>
              </div>
              </React.Fragment>))}
            </div>
            </>)}
          </div>
        </div>
        </>) : null}

        {scApprove ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>제출 문서 형식 OCR 자동검증 · 그 외는 관리자 수동 심사</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>회원 관리</h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '999px', width: 'fit-content', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
            {(apTabs || []).map((t, $index) => (<React.Fragment key={$index}>
            <button onClick={t.go} style={t.style}>{t.label}<span style={t.countStyle}>{t.count}</span></button>
            </React.Fragment>))}
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {apEmpty ? (<>
            <div style={{ padding: '30px 0', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>가입 신청 내역이 없습니다.</div>
            </>) : (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1.1fr 1.1fr 1.4fr', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>회사명</span><span>국가</span><span>사업자등록번호</span><span>신청일시</span><span>검증 경로</span><span style={{ textAlign: 'right' }}>심사</span>
            </div>
            {(approvals || []).map((a, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1.5fr 1.1fr 1.1fr 1.4fr', gap: '12px', padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.3' }}>{a.name}</span><span style={{ fontSize: '11px', color: '#8494AC', lineHeight: '1.3' }}>{a.doc}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={a.ccStyle}>{a.cc}</span><span style={{ fontSize: '13px', color: '#44546F' }}>{a.country}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{a.biz}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{a.at}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <span style={a.routeStyle}>{a.route}</span>
              </span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                {a.isAuto ? (<>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>자동 승인 처리됨</span>
                </>) : null}
                {a.isRejected ? (<>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>반려 처리됨</span>
                </>) : null}
                {a.isManual ? (<>
                <button onClick={a.detail} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="hv14">상세 정보</button>
                <button onClick={a.approve} style={{ height: '34px', padding: '0 14px', border: '0', borderRadius: '10px', background: 'rgba(0,69,169,.10)', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }} className="hv15">승인</button>
                <button onClick={a.reject} style={{ height: '34px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="hv16">반려</button>
                </>) : null}
              </span>
            </div>
            </React.Fragment>))}
            </>)}
          </div>
        </div>
        </>) : null}

        {scMakerDash ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>DPP 현황</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '520px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · DPP 식별자 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <span style={{ height: '36px', padding: '0 16px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: '#F2F6FC', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600' }}>검색</span>
            </div>
            <button onClick={goInput} style={{ marginLeft: 'auto', height: '52px', padding: '0 22px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)' }}>+ 새 DPP 생성</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>등록 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '32px', fontWeight: '700', lineHeight: '1', letterSpacing: '-.02em' }}>{kpiTotal}</span><span style={{ ...kpiNewBadgeStyle, fontSize: '13px' }}>+{kpiNew}</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>이번 달 신규 {kpiNew}건</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>작성중인 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '32px', fontWeight: '700', lineHeight: '1', letterSpacing: '-.02em', color: '#C22B2B' }}>{kpiIncomplete}</span><span style={{ ...kpiActionBadgeStyle, fontSize: '12.5px' }}>조치 필요</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>필드 누락 {kpiMissing}건 · 서류 대기 {kpiWaiting}건</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>{esprUpdate.title}</span></div>
              <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.55', color: '#6B7A93' }}>{esprUpdate.summary}</p>
              <button onClick={esprUpdate.openDetail} style={{ marginTop: 'auto', alignSelf: 'flex-start', height: '28px', padding: '0 10px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '11.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>자세히 보기</button>
            </div>
            <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '20px 22px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '8px', height: '8px', borderRadius: '5px', background: '#4ADE80', boxShadow: '0 0 0 4px rgba(74,222,128,.20)' }}></span><span style={{ fontSize: '14px', fontWeight: '600' }}>ZKP 증명 상태</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '20px', fontWeight: '700' }}>{zkpPendingCount}</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>제출 요구 대기</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '20px', fontWeight: '700', color: '#FCA5A5' }}>{zkpRejectedCount}</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>조건 미달 반려</span></div>
              </div>
              <button onClick={openNotif} style={{ height: '34px', border: '0', borderRadius: '10px', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>알림센터에서 확인</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>최근 작업 DPP 조회</span><span style={{ height: '28px', padding: '0 11px', display: 'grid', placeItems: 'center', borderRadius: '9px', background: '#F2F6FC', color: '#44546F', fontSize: '11.5px', fontWeight: '600' }}>최근순</span></div>
              {recentDppsEmpty ? (<>
              <div style={{ padding: '20px 4px', fontSize: '13px', color: '#8494AC' }}>아직 등록한 DPP가 없습니다.</div>
              </>) : (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(recentDpps || []).map((w, $index) => (<React.Fragment key={$index}>
                <button onClick={w.open} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv20">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '700', color: '#2A3A55' }}>{w.serial}</span>
                    <span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.35' }}>{w.productName}</span>
                  </span>
                  <span style={w.statusChip}>{w.statusLabel}</span>
                </button>
                </React.Fragment>))}
              </div>
              </>)}
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>DPP 입력률</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#12A150' }}></span>완성</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E3A008' }}></span>진행중</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E03B3B' }}></span>미입력</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {(completeness || []).map((c, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 52px', gap: '14px', alignItems: 'center' }}>
                  <button onClick={c.open} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', textAlign: 'left', border: '0', background: 'transparent', padding: '0', cursor: 'pointer' }}>
                    <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600', color: '#0045A9', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{c.id}</span>
                    <span style={{ fontSize: '12.5px', color: '#44546F', lineHeight: '1.35' }}>{c.name}</span>
                  </button>
                  {/* 트랙이 흰색이 되면서 카드 배경(흰색)과 경계가 사라져 막대 길이를 못 읽는다 - 얇은 테두리를 준다. */}
                  <div style={{ display: 'flex', height: '22px', borderRadius: '7px', overflow: 'hidden', border: '1px solid rgba(16,32,64,.14)', boxSizing: 'border-box', ...c.trackStyle }}>
                    {(c.segs || []).map((g, $index) => (<React.Fragment key={$index}><span style={g.style}></span></React.Fragment>))}
                  </div>
                  <span style={c.pctStyle}>{c.pct}%</span>
                </div>
                </React.Fragment>))}
              </div>
              <span style={{ fontSize: '12px', color: '#8494AC' }}>식별자를 클릭하면 생애주기 진행상태와 미충족 필드·책임주체를 확인할 수 있습니다.</span>
            </div>
          </div>
        </div>
        </>) : null}

        {scInput ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>{domainLabel} 도메인 · 필수 필드 {fieldCount}개</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>{inputTitle}</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {batchIssueEnabled ? (<>
              <div style={{ display: 'flex', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px' }}>
                <button onClick={setSingle} style={singleBtn}>단일 발급</button>
                <button onClick={setBatch} style={batchBtn}>배치 대량 발급</button>
              </div>
              </>) : null}
              <button onClick={toggleDppTitle} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '46px', padding: '0 16px', border: '1px solid ' + (dppTitleOpen ? '#0045A9' : 'rgba(16,32,64,.10)'), borderRadius: '14px', background: dppTitleOpen ? 'rgba(0,69,169,.06)' : '#fff', color: dppTitleOpen ? '#0045A9' : '#44546F', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>
                DPP 이름
                {dppTitleUnset ? (<span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#E3A008' }}></span>) : null}
                <span style={{ display: 'inline-block', fontSize: '10px', transform: dppTitleOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>▾</span>
              </button>
            </div>
          </div>

          {/*
            DPP 이름(2026-08-20 강 요청) - 사용자가 이 DPP를 부르는 이름. 시스템 내부
            목록/조회에서만 쓰이고, 공개 여권과 EU 레지스트리는 지금처럼 public_uuid·
            모델명으로만 조회한다. 예전에 이 자리에 있던 "입력 검증 결과" 패널은
            바로 아래 기본 정보 카드 헤더와 같은 숫자를 반복해서 삭제했다.
          */}
          {dppTitleOpen ? (<>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>DPP 이름</span>
              <span style={{ fontSize: '11.5px', color: '#8494AC' }}>내부 식별용 · 선택</span>
            </span>
            <input value={dppTitle} onChange={onDppTitle} placeholder={dppTitlePlaceholder} maxLength={120}
              style={{ height: '48px', padding: '0 14px', border: '1.5px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', width: '100%', boxSizing: 'border-box' }} />
          </div>
          </>) : null}

          {isBatch ? (<>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>배치 발급 설정</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>배치 번호</span><input defaultValue="B-2607-04" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>발급 수량</span><input defaultValue="240" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            </div>
            <div style={{ padding: '13px 14px', borderRadius: '12px', background: 'rgba(227,160,8,.10)', fontSize: '12px', lineHeight: '1.6', color: '#96660A' }}>동일 Heat/Lot 단위로 묶인 제품에만 배치 발급이 허용됩니다.</div>
          </div>
          </>) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '16px', alignItems: 'start' }}>
              {!documentSlotsEmpty ? (<>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>문서 검증</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  {(documentSlots || []).map((d, $index) => (<React.Fragment key={$index}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', padding: '13px 14px', borderRadius: '13px', background: '#F7F9FD', border: '1.5px solid ' + d.tileBorderColor }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                      <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600', flexWrap: 'wrap' }}>{d.label}<span style={{ fontSize: '11px', fontWeight: '500', color: '#8494AC' }}>{d.req}</span></span>
                        {d.labelEn ? (<span style={{ fontSize: '11px', color: '#8494AC' }}>{d.labelEn}</span>) : null}
                      </span>
                      <label htmlFor={d.inputId} style={{ height: '32px', padding: '0 12px', display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(0,69,169,.24)', borderRadius: '9px', background: '#fff', color: '#0045A9', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>{d.fileName ? '재업로드' : '업로드'}</label>
                      <input id={d.inputId} type="file" onChange={d.onFileChange} style={{ display: 'none' }} />
                    </div>
                    <span style={d.categoryChip}>{d.categoryLabel}</span>
                    <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{d.fileName || '아직 업로드되지 않았습니다'}</span>
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
                  </React.Fragment>))}
                </div>
              </div>
              </>) : null}

              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: fieldFormOpen ? '18px' : '0' }}>
                {/*
                  "n/m 입력됨"을 접기 버튼 밖으로 뺐다 - 이 숫자를 누르면 "필수 필드 충족
                  현황" 모달이 열린다. 예전엔 그 모달을 삭제된 "입력 검증 결과" 패널에서만
                  열 수 있었다(2026-08-20). 버튼 안에 버튼을 중첩할 수 없어 형제로 둔다.
                */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <button onClick={toggleFieldForm} style={{ display: 'flex', alignItems: 'center', gap: '8px', border: '0', background: 'transparent', padding: '0', cursor: 'pointer', textAlign: 'left', flex: '1' }}>
                    <span style={{ fontSize: '15px', fontWeight: '600' }}>{formTitle}</span>
                    <span style={{ display: 'inline-block', fontSize: '11px', color: '#8494AC', transform: fieldFormOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s ease' }}>▾</span>
                  </button>
                  <button onClick={openFieldCheck} style={{ height: '28px', padding: '0 10px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '9px', background: '#FBFCFE', fontSize: '12px', color: '#44546F', fontWeight: '600', cursor: 'pointer', flex: 'none' }}>{fieldFilledCount}/{fieldTotalCount} 입력됨</button>
                </div>
                {fieldFormOpen ? (<>
                {(() => {
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
                        <span style={{ ...base, display: 'flex', alignItems: 'center', gap: '10px', background: '#F7F9FD', borderStyle: 'dashed', cursor: 'default' }}>
                          <span style={{ width: '26px', height: '26px', flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '999px', background: f.zkpBg, color: f.zkpFg, fontSize: '14px', fontWeight: '800' }}>{f.zkpMark}</span>
                          <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: '700', color: f.zkpFg }}>{f.zkpLabel}</span>
                            <span style={{ fontSize: '10.5px', color: '#8494AC' }}>{f.zkpHint}</span>
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
                        </span>
                        {f.locked ? (<button type="button" onClick={f.unlock} style={{ height: '22px', padding: '0 9px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '7px', background: '#fff', fontSize: '10.5px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', flex: 'none' }}>수정</button>) : null}
                      </span>
                      {renderInput(f)}
                      <span style={{ fontSize: '11px', color: '#8494AC' }}>{f.sourceLabel}</span>
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
                })()}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(16,32,64,.07)' }}>
                  <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{lastSavedLabel}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '9px' }}>
                      <button onClick={saveDraft} style={{ height: '48px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv21">임시저장</button>
                      <button onClick={issueDpp} disabled={!issueReady} title={issueDisabledHint} style={{ height: '48px', padding: '0 24px', border: '0', borderRadius: '13px', background: issueReady ? '#0045A9' : '#B7C2D6', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: issueReady ? 'pointer' : 'not-allowed', boxShadow: issueReady ? '0 8px 18px rgba(0,69,169,.24)' : 'none' }}>{issueLabel}</button>
                    </div>
                    {!issueReady && issueDisabledHint ? (<span style={{ fontSize: '11.5px', color: '#C22B2B' }}>{issueDisabledHint}</span>) : null}
                  </div>
                </div>
                </>) : null}
              </div>
            </div>
        </div>
        </>) : null}

        {scPartners ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>Tier 3 권한 · 하위 협력사 연동</span>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>협력사 관리</h1>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>초대할 DPP 선택</span>
            {partnerDppsEmpty ? (<>
            <div style={{ padding: '18px 4px', fontSize: '13px', color: '#8494AC' }}>협력사 초대가 필요한(담당 필드가 비어있는) DPP가 없습니다.</div>
            </>) : null}
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '2px' }}>
              {(partnerDpps || []).map((d, $index) => (<React.Fragment key={$index}>
              <button onClick={d.select} style={d.cardStyle}>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: d.selected ? 'rgba(255,255,255,.8)' : '#8494AC' }}>{d.id}</span>
                <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{d.name}</span>
                <span style={{ fontSize: '11.5px', color: d.selected ? 'rgba(255,255,255,.7)' : '#8494AC' }}>완성도 {d.pct}%</span>
              </button>
              </React.Fragment>))}
            </div>
          </div>

          {partnersHasSelection ? (<>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>새 초대 보내기 · {partnersSelectedDppName}</span>
              {(inviteRows || []).map((row, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '13px', background: '#FBFCFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#8494AC' }}>협력사 {$index + 1}</span>
                  {row.canRemove ? (<button onClick={row.remove} style={{ border: '0', background: 'transparent', color: '#8494AC', fontSize: '12px', cursor: 'pointer' }}>삭제</button>) : null}
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>협력사명</span><input placeholder="예) 우진메탈" value={row.orgName} onChange={row.onOrgName} style={{ height: '44px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '11px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>초대 이메일</span><input type="email" placeholder="partner@company.co.kr" value={row.email} onChange={row.onEmail} style={{ height: '44px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '11px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>역할(제출 항목)</span>
                  <select value={row.roleCode} onChange={row.onRoleCode} style={{ height: '44px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '11px', fontSize: '13.5px', background: '#fff' }}>
                    {(inviteRoleOptions || []).map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                </label>
              </div>
              </React.Fragment>))}
              <button onClick={addInviteRow} style={{ height: '40px', border: '1px dashed rgba(0,69,169,.34)', borderRadius: '11px', background: 'rgba(0,69,169,.035)', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ 협력사 추가</button>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>메시지</span><textarea rows="3" placeholder="협력사에 전달할 안내 문구를 입력하세요." style={{ padding: '12px 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '13.5px', lineHeight: '1.6', resize: 'vertical' }}></textarea></label>
              <button onClick={sendInvite} style={{ height: '50px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>{inviteSendLabel}</button>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>초대 이력 · {partnersSelectedDppName}</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#0B1B33', color: '#fff', fontSize: '12px', fontWeight: '600' }}>전체 {inviteTotal}</span>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>대기 {invitePending}</span>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>거절 {inviteRejected}</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr .95fr .85fr .85fr 70px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
                <span>협력사 / 이메일</span><span>역할</span><span>발송일</span><span>상태</span><span></span>
              </div>
              {invitesEmpty ? (<>
              <div style={{ padding: '30px 12px', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>이 DPP에 보낸 초대가 없습니다.</div>
              </>) : null}
              {(invites || []).map((i, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr .95fr .85fr .85fr 70px', gap: '12px', padding: '0 14px', height: '58px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{i.name}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{i.email}</span></span>
                <span style={{ fontSize: '12px', color: '#44546F' }}>{i.roleLabel}</span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{i.at}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: 'fit-content', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={i.statusDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{i.status}</span></span>
                <button onClick={i.resend} style={i.resendStyle}>재발송</button>
              </div>
              </React.Fragment>))}
            </div>
          </div>
          </>) : null}
        </div>
        </>) : null}

        {scProducts ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>제품 조회</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '520px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · 식별자 · Lot/Heat 번호" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              {(productFilterTabs || []).map((t, $index) => (<React.Fragment key={$index}>
              <button onClick={t.go} style={t.style}>{t.label}</button>
              </React.Fragment>))}
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr .9fr 1fr 116px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>DPP 식별자</span><span>제품명 / 규격</span><span>Lot · Heat</span><span>발급일</span><span style={{ textAlign: 'right' }}>완성도</span><span>상태</span><span></span>
            </div>
            {(products || []).map((p, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr .9fr 1fr 116px', gap: '12px', padding: '0 14px', height: '60px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <button onClick={p.resume} title="이어서 작성" style={{ border: '0', background: 'transparent', padding: '0', textAlign: 'left', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.id}</button>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{p.name}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{p.spec}</span></span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{p.lot}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{p.at}</span>
              <span style={p.pctStyle}>{p.pct}%</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: 'fit-content', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={p.statusDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{p.status}</span></span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                <button onClick={p.open} style={{ height: '32px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv22">상세</button>
                <button onClick={p.remove} title="DPP 삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv23"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scPartnerAssigned ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>협력사 계정</span>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>참여 DPP</h1>
          </div>

          {partnerAssignedHasSelection ? (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button onClick={partnerAssignedBack} style={{ alignSelf: 'flex-start', border: '0', background: 'transparent', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>← 목록으로</button>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>{partnerAssignedSelectedLabel} · 담당 항목 입력</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {(partnerFields || []).map((f, $index) => (<React.Fragment key={$index}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>{f.label}</span>
                  <input placeholder={f.ph} value={f.value} onChange={f.onChange} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', background: '#fff' }} />
                  <span style={{ fontSize: '11px', color: '#8494AC' }}>{f.hint}</span>
                </label>
                </React.Fragment>))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(16,32,64,.07)' }}>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{partnerFieldFilledCount} / {partnerFieldTotalCount}개 입력 완료</span>
                <button onClick={partnerSaveDraft} style={{ height: '48px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>제출</button>
              </div>
            </div>
            {(partnerDocumentSlots || []).length > 0 ? (<>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>담당 문서</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(partnerDocumentSlots || []).map((d, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px 14px', borderRadius: '13px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600' }}>{d.label}<span style={{ fontSize: '11px', fontWeight: '500', color: '#8494AC' }}>{d.req}</span></span>
                    {d.labelEn ? (<span style={{ fontSize: '11px', color: '#8494AC' }}>{d.labelEn}</span>) : null}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#8494AC' }}><span style={d.dot}></span>{d.statusLabel}{d.fileName ? (' · ' + d.fileName) : ''}</span>
                  </span>
                  <label htmlFor={d.inputId} style={{ height: '36px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', border: '1px solid rgba(0,69,169,.24)', borderRadius: '10px', background: '#fff', color: '#0045A9', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>업로드</label>
                  <input id={d.inputId} type="file" onChange={d.onFileChange} style={{ display: 'none' }} />
                </div>
                </React.Fragment>))}
              </div>
            </div>
            </>) : null}
          </div>
          </>) : (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {participationsEmpty ? (<>
            <div style={{ padding: '40px 12px', textAlign: 'center', fontSize: '13px', color: '#8494AC', background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px' }}>아직 참여 요청받은 DPP가 없습니다. 초대 메일을 받은 이메일로 가입했는지 확인해 주세요.</div>
            </>) : null}
            {(participations || []).map((p, $index) => (<React.Fragment key={$index}>
            <button onClick={p.open} style={p.cardStyle}>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>{p.label}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={p.statusDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{p.statusLabel}</span></span>
              </span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{p.owner} · {p.roleLabel} 담당 · {p.filled}/{p.total}개 입력 · {p.pct}%</span>
            </button>
            </React.Fragment>))}
          </div>
          </>)}
        </div>
        </>) : null}

        <MyPage {...v} />

        {scScans ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1120px', margin: '0 auto', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', width: '100%' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', whiteSpace: 'nowrap' }}>제품 조회 기록</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '460px', height: '52px', padding: '0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · 브랜드 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
            </div>
          </div>
          <div style={{ width: '100%', background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>제품명</span><span>제조사</span><span>열람 일시</span><span>최근 갱신</span><span></span>
            </div>
            {scansEmpty ? (<>
            <div style={{ padding: '40px 12px', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>아직 조회한 제품이 없습니다. QR을 스캔하면 여기에 기록됩니다.</div>
            </>) : null}
            {(scans || []).map((p, $index) => (<React.Fragment key={$index}>
            <div style={p.rowStyle}>
              <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.3' }}>{p.name}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC', lineHeight: '1.3' }}>{p.id}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#44546F' }}>{p.company}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{p.at}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{p.updated}</span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                <button onClick={p.open} style={{ height: '32px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv27">열람</button>
                <button onClick={p.remove} title="조회 기록 삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv28"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scPassport ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <button onClick={backToScans} style={{ alignSelf: 'flex-start', height: '40px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>← 제품 조회 기록으로</button>

          {passportNotFound ? (<>
          <div style={{ minHeight: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', padding: '60px 0' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: '999px', background: 'rgba(227,160,8,.14)', display: 'grid', placeItems: 'center', color: '#96660A', fontSize: '22px', fontWeight: '700' }}>!</span>
            <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '700', textAlign: 'center' }}>조회 결과 없음</h1>
            <p style={{ margin: '0', fontSize: '13.5px', color: '#6B7A93', textAlign: 'center', lineHeight: '1.65' }}>「{passportId}」에 해당하는 DPP를 찾을 수 없습니다.<br />QR에 담긴 식별자를 다시 확인해 주세요.</p>
          </div>
          </>) : null}

          {passportBasic ? (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '22px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '26px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#12A150' }}></span>{basicStatus}</span>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{basicMaterialLabel} · 입력된 데이터만 표시됩니다</span>
              </div>
              <h1 style={{ margin: '0', fontSize: '28px', fontWeight: '700' }}>{passportName}</h1>
              <span style={{ fontSize: '13px', color: '#6B7A93' }}>식별자 {passportId}</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>입력된 데이터</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                {(basicFields || []).map((f, $index) => (<React.Fragment key={$index}>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{f.label}</span><span style={f.sourceChip}>{f.sourceLabel}</span></span>
                  <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{f.value}</span>
                </div>
                </React.Fragment>))}
              </div>
            </div>
          </div>
          </>) : null}

          {!passportBasic && !passportNotFound ? (<>

          {passportExpired ? (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(224,59,59,.07)', border: '1px solid rgba(224,59,59,.20)' }}>
            <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: '#E03B3B', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>!</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#C22B2B' }}>블록체인 서명 검증에 실패했습니다</span>
              <span style={{ fontSize: '12.5px', lineHeight: '1.55', color: '#44546F' }}>원본 기록과 현재 데이터의 해시가 일치하지 않습니다. 아래 정보는 참고용이며, 제조사에 확인 후 이용하세요.</span>
            </span>
          </div>
          </>) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '26px', background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '22px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '26px' }}>
            <div style={{ height: '300px', borderRadius: '18px', border: '1.5px dashed rgba(16,32,64,.16)', background: '#F7F9FD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#6B7A93' }}>제품 사진</span>
              <span style={{ fontSize: '12px', color: '#9AA8BE' }}>스캔한 제품의 대표 이미지</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {passportValid ? (<><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#12A150' }}></span>블록체인 검증 완료</span></>) : null}
                  {passportExpired ? (<><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(224,59,59,.12)', color: '#C22B2B', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#E03B3B' }}></span>검증 실패 · 참고용</span></>) : null}
                  <span style={{ fontSize: '12.5px', color: '#8494AC' }}>Digital Product Passport</span>
                </div>
                <h1 style={{ margin: '0', fontSize: '32px', fontWeight: '700', textWrap: 'pretty' }}>{passportName}</h1>
                <span style={{ fontSize: '15px', color: '#44546F' }}>{passportBrand}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>모델명</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportModel}</span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>바코드 (GTIN)</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportGtin}</span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>제조 번호 (Batch)</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportBatch}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>{passportOrigin}</span>
                <span style={{ fontSize: '13px', color: '#6B7A93' }}>{passportMade} · 식별자 {passportId}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>지속가능성 요약</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>탄소 발자국</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1' }}>{ecoCarbon}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>{ecoCarbonUnit}</span></div>
                <span style={{ fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>원자재 채굴부터 출하까지 발생한 온실가스 배출량입니다.</span>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>재생 원료 사용률</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1', color: '#0045A9' }}>{ecoRecycled}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>%</span></div>
                <div style={{ height: '10px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={ecoRecycledBar}></span></div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>물 발자국</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1' }}>{ecoWater}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>{ecoWaterUnit}</span></div>
                <span style={{ fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>제조 공정에서 취수·소비된 담수 총량입니다.</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>내구성 및 수리 가이드</span>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', alignItems: 'start' }}>
              <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '24px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'rgba(255,255,255,.66)' }}>수리 용이성 점수</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}><span style={repairColorStyle}>{repairScore}</span><span style={{ fontSize: '16px', color: 'rgba(255,255,255,.6)' }}>/ 10</span></div>
                <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}><span style={repairBar}></span></div>
                <span style={{ fontSize: '12.5px', lineHeight: '1.6', color: 'rgba(255,255,255,.76)' }}>{repairVerdict}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <button onClick={openManual} style={{ height: '44px', border: '0', borderRadius: '12px', background: '#fff', color: '#0B1B33', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>{manualName}</button>
                  <button onClick={openVideo} style={{ height: '44px', border: '1px solid rgba(255,255,255,.26)', borderRadius: '12px', background: 'rgba(255,255,255,.10)', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>수리 영상 보기</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>예비 부품 및 수리 서비스</span>
                  {(partItems || []).map((p, $index) => (<React.Fragment key={$index}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{p.title}</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>{p.detail}</span></span>
                    <a href="#" style={{ fontSize: '12.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>구매처 보기</a>
                  </div>
                  </React.Fragment>))}
                </div>
                <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>오래 쓰는 관리 방법</span>
                  {(careItems || []).map((c, $index) => (<React.Fragment key={$index}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ width: '7px', height: '7px', marginTop: '6px', flex: 'none', borderRadius: '999px', background: '#0045A9' }}></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{c.title}</span><span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{c.detail}</span></span>
                  </div>
                  </React.Fragment>))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>우려 물질 및 안전 정보</span>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {hazardSafe ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(18,161,80,.08)' }}>
                  <span style={{ width: '36px', height: '36px', flex: 'none', borderRadius: '999px', background: '#12A150', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' }}>✓</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14.5px', fontWeight: '700', color: '#0E7A3D' }}>우려 물질 무첨가</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{hazardNote}</span></span>
                </div>
                </>) : null}
                {hazardRisk ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(227,160,8,.10)' }}>
                  <span style={{ width: '36px', height: '36px', flex: 'none', borderRadius: '999px', background: '#E3A008', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' }}>!</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14.5px', fontWeight: '700', color: '#96660A' }}>주의가 필요한 물질 포함</span><span style={{ fontSize: '12.5px', lineHeight: '1.55', color: '#44546F' }}>{hazardNote}</span></span>
                </div>
                </>) : null}
                <span style={{ fontSize: '12px', lineHeight: '1.65', color: '#8494AC' }}>EU REACH 규정 기준 고위험 우려물질(SVHC) 목록에 따라 신고된 정보입니다. 이상 증상이 있을 경우 사용을 중단하고 제조사에 문의하세요.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>올바른 폐기 및 재활용</span>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(disposalItems || []).map((d, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ width: '7px', height: '7px', marginTop: '6px', flex: 'none', borderRadius: '999px', background: '#12A150' }}></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{d.title}</span><span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{d.detail}</span></span>
                </div>
                </React.Fragment>))}
                <button onClick={openTakeback} style={{ height: '48px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' }}>{takebackName}</button>
              </div>
            </div>
          </div>
          </>) : null}
        </div>
        </>) : null}


        {obGovBanner ? (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(0,69,169,.05)', border: '1.5px solid rgba(0,69,169,.24)' }}>
          <span style={{ width: '8px', height: '8px', flex: 'none', borderRadius: '999px', background: '#E3A008' }}></span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩이 완료되지 않았습니다</span>
            <span style={{ fontSize: '12.5px', color: '#44546F' }}>{obGovBannerText} 완료해야 모든 조회 권한이 활성화됩니다.</span>
          </span>
          <button onClick={obResume} style={{ marginLeft: 'auto', height: '44px', padding: '0 20px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,69,169,.22)', whiteSpace: 'nowrap' }}>온보딩 이어서 작성</button>
        </div>
        </>) : null}

        {scClearance ? (<>

        {cSearchMode ? (<>
        <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '60px 0', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <h1 style={{ margin: '0', fontSize: '44px', fontWeight: '700', textAlign: 'center' }}>통관 검증</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '720px', height: '68px', padding: '0 10px 0 24px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(11,27,51,.10)' }}>
            <span style={{ width: '18px', height: '18px', border: '2px solid #9AA8BE', borderRadius: '10px', flex: 'none' }}></span>
            <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP-KR-ST-2607-0142" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '17px', color: '#0B1B33' }} />
            <button onClick={runCustomsSearch} style={{ height: '50px', padding: '0 28px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>검색</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: '#8494AC' }}>최근 조회</span>
            {(cRecent || []).map((r, $index) => (<React.Fragment key={$index}>
            <button onClick={r.pick} style={{ height: '34px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '999px', background: '#fff', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv29">{r.label}</button>
            </React.Fragment>))}
          </div>

          <div style={{ width: '100%', maxWidth: '760px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>통관 대기 목록</span>
            {cQueueEmpty ? (
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>현재 배정된 심사 대기 건이 없습니다. 수출/수입 관할이 이 세관과 일치하는 통관 신청이 들어오면 여기에 표시됩니다.</span>
            ) : (
              (cQueueRows || []).map((q, $index) => (<React.Fragment key={$index}>
              <button onClick={q.open} style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr auto', gap: '10px', alignItems: 'center', height: '48px', padding: '0 12px', border: '1px solid rgba(16,32,64,.07)', borderRadius: '12px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv29">
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#0045A9' }}>{q.idLabel}</span>
                <span style={{ fontSize: '12.5px' }}>{q.name}</span>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{q.sideLabel} · {q.route}</span>
                <span style={{ fontSize: '11px', color: '#6B7A93' }}>{q.importer}</span>
              </button>
              </React.Fragment>))
            )}
          </div>
        </div>
        </>) : null}

        {cNoResult ? (<>
        <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '26px', padding: '60px 0', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: '999px', background: 'rgba(227,160,8,.14)', display: 'grid', placeItems: 'center', color: '#96660A', fontSize: '22px', fontWeight: '700' }}>!</span>
            <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', textAlign: 'center' }}>조회 결과 없음</h1>
            <p style={{ margin: '0', fontSize: '14px', color: '#6B7A93', textAlign: 'center', lineHeight: '1.65' }}>입력하신 「{cQuery}」에 해당하는 화물을 찾을 수 없습니다.<br />DPP 식별자, 수입신고번호 또는 EORI 번호를 다시 확인해 주세요.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '620px', height: '60px', padding: '0 10px 0 22px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '18px', boxShadow: '0 6px 20px rgba(11,27,51,.08)' }}>
            <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP-KR-ST-2607-0142" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '15.5px', color: '#0B1B33' }} />
            <button onClick={runCustomsSearch} style={{ height: '44px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>다시 검색</button>
          </div>
          <button onClick={resetCustomsSearch} style={{ height: '42px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '999px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv30">검색 화면으로</button>
        </div>
        </>) : null}

        {cResultMode ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={resetCustomsSearch} style={{ height: '44px', padding: '0 18px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }} className="hv31">← 검색으로</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP 식별자 · 수입신고번호 · EORI 번호" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <button onClick={runCustomsSearch} style={{ height: '36px', padding: '0 16px', border: '0', borderRadius: '11px', background: '#F2F6FC', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>검색</button>
            </div>
            <button onClick={showQr} style={{ height: '52px', padding: '0 20px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '15px', background: '#fff', color: '#0045A9', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>QR 보기</button>
            <button onClick={cDownloadAll} style={{ height: '52px', padding: '0 22px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)', whiteSpace: 'nowrap', flex: 'none' }}>인증서 일괄 다운로드</button>
          </div>

          <div style={cVerdictStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={cVerdictDot}></span>
              <span style={cVerdictTextStyle}>{cVerdict}</span>
              {cCanDecide ? (
              <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                <button onClick={cApprove} style={{ height: '42px', padding: '0 18px', border: '0', borderRadius: '12px', background: '#12A150', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>승인</button>
                <button onClick={cHold} style={{ height: '42px', padding: '0 18px', border: '1px solid rgba(227,160,8,.32)', borderRadius: '12px', background: 'rgba(227,160,8,.10)', color: '#96660A', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>보류</button>
                <button onClick={cReject} style={{ height: '42px', padding: '0 18px', border: '1px solid rgba(224,59,59,.28)', borderRadius: '12px', background: 'rgba(224,59,59,.08)', color: '#C22B2B', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>반려</button>
              </div>
              ) : null}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>신원 및 신고 정보</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>제품 고유 식별 코드</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cId}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수입신고번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cDeclared}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>EORI 번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cEori}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수량</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cQty}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수입업체</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cImporter}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{cImporterAddr}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수출업체</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cExporter}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>품목 {cName}</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>HS 코드</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '18px', fontWeight: '700' }}>{cHs}</span></span>
                  <span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#44546F' }}>{cHsName}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>EU 적합성 선언서 · CE 마크</span>
                {cCeOk ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(18,161,80,.08)' }}>
                  <span style={{ width: '34px', height: '34px', flex: 'none', borderRadius: '999px', background: '#12A150', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>✓</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '700', color: '#0E7A3D' }}>적합성 요건 충족</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{cCeNote}</span></span>
                </div>
                </>) : null}
                {cCeFail ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(224,59,59,.07)' }}>
                  <span style={{ width: '34px', height: '34px', flex: 'none', borderRadius: '999px', background: '#E03B3B', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>!</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '700', color: '#C22B2B' }}>적합성 요건 미충족</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{cCeNote}</span></span>
                </div>
                </>) : null}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cDoc}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{cTech}</span></span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>검증 항목</span>
                {(cChecks || []).map((c, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '11px', alignItems: 'flex-start' }}>
                  <span style={c.markStyle}>{c.mark}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '13px', fontWeight: '600', lineHeight: '1.35' }}>{c.label}</span><span style={c.detailStyle}>{c.detail}</span></span>
                </div>
                </React.Fragment>))}
              </div>
            </div>
          </div>
        </div>
        </>) : null}

        </>) : null}

        {scRegistry ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>시장감독기관 · 제품안전조사과</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>DPP 레지스트리 조회</h1>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>식별자(UUID 일부)</span><input value={euQuery} onChange={onEuQueryChange} placeholder="예: 3f2a 또는 SKU/모델명 일부" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>등록회사</span><input value={euQuery} readOnly placeholder="위 검색어로 함께 조회됨" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace', background: '#F7F9FD', color: '#8494AC' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>HS 코드</span><input value={euQuery} readOnly placeholder="위 검색어로 함께 조회됨" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace', background: '#F7F9FD', color: '#8494AC' }} /></label>
            <button onClick={searchRegistry} style={{ height: '48px', padding: '0 26px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>조회</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>조회 결과 <span style={{ color: '#8494AC', fontWeight: '500' }}>{registry.length}건</span></span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 1.2fr 1.5fr 1.2fr .9fr 64px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>식별자(UUID)</span><span>Lot/시리얼</span><span>발급일</span><span>상품명</span><span>등록회사</span><span>HS코드</span><span></span>
            </div>
            {(registry || []).map((r, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 1.2fr 1.5fr 1.2fr .9fr 64px', gap: '12px', padding: '0 14px', height: '58px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#0045A9' }}>{r.id}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{r.code}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.3' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#0B1B33' }}>{r.date}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11px', color: '#8494AC' }}>{r.time}</span></span>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{r.name}</span>
              <span style={{ fontSize: '12.5px', color: '#44546F' }}>{r.company}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{r.hs}</span>
              <button onClick={r.open} style={{ width: '100%', height: '32px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv33">열람</button>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scAudit ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>변조 불가 · 블록체인 앵커링 검증</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>감사 로그 조회</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>2026-07-01 ~ 07-30</button>
              <button style={{ height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>액션 전체</button>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 1.4fr 1.5fr .9fr 1.3fr', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>시각 (UTC)</span><span>행위자</span><span>액션</span><span>대상</span><span>결과</span><span>트랜잭션 해시</span>
            </div>
            {(auditLog || []).map((l, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 1.4fr 1.5fr .9fr 1.3fr', gap: '12px', padding: '0 14px', height: '54px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#0B1B33' }}>{l.at}</span>
              <span style={{ fontSize: '12.5px', color: '#44546F' }}>{l.actor}</span>
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{l.action}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#44546F' }}>{l.target}</span>
              <span style={l.chip}>{l.result}</span>
              <a href="#" style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '500' }}>{l.hash}</a>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

      </div>
      </>) : null}

      {notifOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '70', display: 'flex', justifyContent: 'flex-end' }}>
        <div onClick={closeNotif} style={{ position: 'absolute', inset: '0', background: 'rgba(11,27,51,.28)', backdropFilter: 'blur(2px)' }}></div>
        <div style={{ position: 'relative', width: '436px', height: '100%', background: '#fff', boxShadow: '-18px 0 44px rgba(11,27,51,.18)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '22px 24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid rgba(16,32,64,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '17px', fontWeight: '700' }}>알림센터</span><span style={tier2Chip}>읽지 않음 {notifUnreadCount || 0}</span></div>
              <button onClick={closeNotif} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
            {notifCatsVisible ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(notifCats || []).map((c, $index) => (<React.Fragment key={$index}><button onClick={c.go} style={c.style}>{c.label}</button></React.Fragment>))}
            </div>
            ) : null}
          </div>
          <div style={{ flex: '1', overflow: 'auto', padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notifEmpty ? (<>
            <div style={{ padding: '32px 12px', textAlign: 'center', fontSize: '13px', color: '#8494AC' }}>알림이 없습니다.</div>
            </>) : null}
            {(notifications || []).map((n, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
              <span style={n.dot}></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={n.chip}>{n.cat}</span><span style={{ fontSize: '11px', color: '#8494AC', marginLeft: 'auto' }}>{n.at}</span></span>
                <span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.45' }}>{n.title}</span>
                <span style={{ fontSize: '12px', color: '#6B7A93', lineHeight: '1.55' }}>{n.body}</span>
                {n.hasAction ? (<>
                <button onClick={n.act} style={{ alignSelf: 'flex-start', marginTop: '2px', height: '32px', padding: '0 13px', border: '1px solid rgba(0,69,169,.22)', borderRadius: '10px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{n.actionLabel}</button>
                </>) : null}
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      {dppOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '72', display: 'flex', justifyContent: 'flex-end' }}>
        <div onClick={closeDpp} style={{ position: 'absolute', inset: '0', background: 'rgba(11,27,51,.32)', backdropFilter: 'blur(2px)' }}></div>
        <div style={{ position: 'relative', width: '560px', height: '100%', background: '#fff', boxShadow: '-18px 0 44px rgba(11,27,51,.20)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 26px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>{dppId}</span>
                <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-.02em' }}>{dppName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={dppStatusChip}>완성도 {dppPct}%</span><span style={{ fontSize: '12px', color: '#8494AC' }}>{dppSpec}</span></div>
              </div>
              <button onClick={closeDpp} style={{ width: '34px', height: '34px', flex: 'none', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ flex: '1', overflow: 'auto', padding: '22px 26px 30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px', borderRadius: '16px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)' }}>
              {dppDetailQrImg ? (
                <img src={dppDetailQrImg} alt="DPP QR" style={{ width: '96px', height: '96px', borderRadius: '10px', border: '1px solid rgba(16,32,64,.08)', flex: 'none' }} />
              ) : (
                <div style={{ width: '96px', height: '96px', borderRadius: '10px', background: '#EEF2F8', flex: 'none', display: 'grid', placeItems: 'center', fontSize: '11px', color: '#8494AC', textAlign: 'center', padding: '6px' }}>{dppDetailQrPending ? '생성 중…' : (dppPct === 100 ? 'QR 없음' : '발급 전')}</div>
              )}
              <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700' }}>이 DPP의 QR 코드</span>
                <span style={{ fontSize: '11.5px', color: '#8494AC', lineHeight: '1.6' }}>{dppPct === 100 ? 'QR을 스캔하면 이 DPP의 조회 화면으로 바로 연결됩니다.' : '발급 완료(완성도 100%) 후 QR이 자동으로 생성됩니다.'}</span>
              </span>
            </div>

            {dppCanRequestClearance ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px', padding: '18px', borderRadius: '16px', background: '#FBFCFE', border: '1px solid rgba(16,32,64,.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700' }}>통관 신청</span>
                  <span style={{ fontSize: '11.5px', color: '#8494AC', lineHeight: '1.6' }}>수입국을 선언하면 수출/수입 관할 세관에 이 DPP가 심사 대기 건으로 배정됩니다.</span>
                </span>
                {!crOpen ? (<button onClick={openClearanceRequest} style={{ height: '38px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '11px', background: '#fff', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>신청하기</button>) : null}
              </div>
              {crOpen ? (<>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', fontWeight: '600', color: '#44546F' }}>수입국</span><input value={crImportCountryCode} onChange={onCrImportCountryCode} placeholder="독일" style={{ height: '42px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '10px', fontSize: '13px' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', fontWeight: '600', color: '#44546F' }}>신고 HS 코드</span><input value={crDeclaredHsCode} onChange={onCrDeclaredHsCode} placeholder="7208.39" style={{ height: '42px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '10px', fontSize: '13px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', fontWeight: '600', color: '#44546F' }}>수입업체명</span><input value={crImporterName} onChange={onCrImporterName} placeholder="Nordwerk GmbH" style={{ height: '42px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '10px', fontSize: '13px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', fontWeight: '600', color: '#44546F' }}>수입업체 주소</span><input value={crImporterAddress} onChange={onCrImporterAddress} placeholder="독일 뒤스부르크 · Hafenstraße 22" style={{ height: '42px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '10px', fontSize: '13px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', fontWeight: '600', color: '#44546F' }}>EORI 번호(선택)</span><input value={crImporterEori} onChange={onCrImporterEori} placeholder="DE7412880033100" style={{ height: '42px', padding: '0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '10px', fontSize: '13px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={closeClearanceRequest} style={{ height: '38px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>취소</button>
                  <button onClick={submitClearanceRequest} style={{ height: '38px', padding: '0 18px', border: '0', borderRadius: '11px', background: '#0045A9', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>신청 제출</button>
                </div>
              </div>
              </>) : null}
            </div>
            </>) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>생애주기 진행상태</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(lifecycle || []).map((l, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}><span style={l.dot}></span><span style={l.line}></span></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '18px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{l.stage}</span><span style={l.chip}>{l.state}</span></span>
                    <span style={{ fontSize: '12px', color: '#6B7A93', lineHeight: '1.55' }}>{l.detail}</span>
                  </span>
                </div>
                </React.Fragment>))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '14px', fontWeight: '700' }}>미충족 필드 및 책임주체</span><span style={{ fontSize: '12px', color: '#8494AC' }}>{dppMissingCount}건</span></div>
              {(missingFields || []).map((f, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={f.sevDot}></span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{f.field}</span></span>
                  <span style={{ fontSize: '12px', color: '#6B7A93' }}>책임주체 · {f.owner} · {f.role}</span>
                </span>
                <button onClick={f.nudge} style={{ height: '36px', padding: '0 14px', border: '0', borderRadius: '11px', background: 'rgba(0,69,169,.10)', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }} className="hv34">독촉 알림 전송</button>
              </div>
              </React.Fragment>))}
              <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>책임주체를 클릭하면 문서 업로드 독촉 알림이 담당자 이메일과 알림센터로 동시에 발송됩니다.</p>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {obOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '76', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)', backdropFilter: 'blur(3px)' }}></div>
        <div style={{ position: 'relative', width: '760px', maxHeight: '100%', background: '#fff', borderRadius: '24px', boxShadow: '0 30px 70px rgba(6,17,36,.34)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '26px 30px 20px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '.1em', color: '#0045A9' }}>ONBOARDING · STEP {obStep} / {obLastStep}</span>
                <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.02em' }}>{obTitle}</span>
              </div>
              <button onClick={obClose} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(obBars || []).map((b, $index) => (<React.Fragment key={$index}><span style={b.style}></span></React.Fragment>))}
            </div>
          </div>

          <div style={{ padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto' }}>
            {obIs1 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>도메인에 따라 요구되는 필수 데이터와 입력 화면이 달라집니다. 주력 도메인을 선택해 주세요.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                <button onClick={obPickSteel} style={obSteelCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>철강</span></button>
                <button onClick={obPickBattery} style={obBatteryCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>배터리</span></button>
                <button onClick={obPickTextile} style={obTextileCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>섬유·패션</span></button>
              </div>
            </div>
            </>) : null}

            {obG1 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>국가 및 관할을 식별하는 고유 기관 ID를 등록합니다. 등록된 코드로 모든 조회·처리 이력이 기록됩니다.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>기관명</span><input placeholder={obGovOrgPlaceholder} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>국가 코드 (ISO 3166)</span><input placeholder="KR" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>{obGovIdLabel}</span><input placeholder={obGovIdPlaceholder} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>공식 기관 식별 코드</span><input placeholder={obGovCodeSample} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '13px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)', fontSize: '12.5px', lineHeight: '1.65', color: '#44546F' }}>입력한 식별 코드는 국가 기관 등록부와 자동 대조되며, 일치하지 않으면 다음 단계로 진행할 수 없습니다.</div>
            </div>
            </>) : null}

            {obC2 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>국가 통관 시스템(Single Window)과 자동 연동하기 위한 인증 정보를 등록합니다.</p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>Single Window 연동 API 키</span><input placeholder="sw_live_••••••••••••••••" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>API 시크릿</span><input type="password" placeholder="발급받은 시크릿 키" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>보안 IP 대역 (허용 목록)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <input placeholder="203.245.10.0/24" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} />
                  <button style={{ height: '48px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>대역 추가</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(0,69,169,.08)', color: '#0045A9', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600' }}>203.245.10.0/24</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(0,69,169,.08)', color: '#0045A9', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600' }}>210.94.32.0/22</span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>등록된 대역 밖에서의 API 호출은 자동 차단됩니다.</span>
              </div>
            </div>
            </>) : null}

            {obM2 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>포털에 직접 접속해 단속을 수행할 담당 공무원의 신원 정보를 등록합니다. 모든 열람 기록은 이 사번으로 남습니다.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사관 성명</span><input placeholder="예) 윤가람" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>고유 사번</span><input placeholder="예) MSA-2026-0417" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>소속 부서 · 직위</span><input placeholder="예) 제품안전조사과 · 조사관" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>통합 로그인(SSO) 계정</span><input placeholder="name@korea.kr" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>정부 통합 SSO 연동</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>기관 계정으로 인증하면 사번이 자동 대조됩니다</span></span>
                <button style={{ height: '38px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>SSO 연결</button>
              </div>
            </div>
            </>) : null}

            {obG3 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>eIDAS 등 정부 기관용 적격 전자신원 인증서를 등록합니다. 인증서는 열람 기록에 전자서명으로 첨부됩니다.</p>
              <div style={{ border: '1.5px dashed rgba(0,69,169,.34)', borderRadius: '16px', background: 'rgba(0,69,169,.035)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(0,69,169,.10)', display: 'grid', placeItems: 'center' }}><span style={{ width: '14px', height: '14px', background: '#0045A9', borderRadius: '3px' }}></span></span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>적격 전자신원 인증서를 업로드하세요</span>
                <span style={{ fontSize: '12px', color: '#6B7A93' }}>eIDAS QSeal / QWAC · .p12 · .pfx · .cer 형식</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>인증서 유형</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>eIDAS 적격 전자인장 (QSeal)</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>발급 기관</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>한국정보인증 (Qualified TSP)</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>인증서 일련번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', fontWeight: '600' }}>4A:2F:88:C1:07:E9</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>유효기간</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', fontWeight: '600' }}>2026-01-15 ~ 2029-01-14</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>검증 상태</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>EU 신뢰목록 확인됨</span></span></div>
              </div>
            </div>
            </>) : null}

            {obC4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>수입품의 고유 식별자(UPI)를 조회·검증할 수 있는 시스템 권한(Role)을 신청합니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>UPI 조회 (CUSTOMS_UPI_READ)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>수입품 고유 식별자로 DPP 원본 조회</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>필수</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>유효성 검증 (CUSTOMS_VERIFY)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>여권 서명·정지 여부·적합성 선언서 검증</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>필수</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>통관 판정 기록 (CUSTOMS_DECIDE)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>통관 가능·보류 판정 및 이력 저장</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>선택</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>일괄 조회 (CUSTOMS_BULK)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>화물 단위 다건 UPI 동시 검증</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>선택</span></label>
              </div>
            </div>
            </>) : null}

            {obM4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>기업의 영업비밀·세부 공급망 등 제한된 데이터를 열람하려면 법적 권한 증명과 조사 목적 기록이 필요합니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>공개 DPP 열람</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>일반 공개 항목 조회 · 별도 증명 불필요</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1.5px solid rgba(224,59,59,.28)', borderRadius: '13px', background: 'rgba(224,59,59,.04)', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#C22B2B' }}>영업비밀 데이터 열람 (제한)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>원가·공정 파라미터 등 ZKP 비공개 원본 조회</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1.5px solid rgba(224,59,59,.28)', borderRadius: '13px', background: 'rgba(224,59,59,.04)', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#C22B2B' }}>세부 공급망 소급 조회 (제한)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>Tier 2~4 협력사 및 원자재 단계까지 추적</span></span></label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '16px', background: '#F7F9FD' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '700' }}>법적 권한 증명 및 조사 목적 기록</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>근거 법령</span><input placeholder="예) 제품안전기본법 제12조" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', background: '#fff' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사 명령서 번호</span><input placeholder="예) MSA-INV-2026-0188" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace', background: '#fff' }} /></label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사 목적</span><textarea rows="3" placeholder="열람이 필요한 사유와 조사 범위를 기재하세요. 입력 내용은 감사 로그에 영구 기록됩니다." style={{ padding: '12px 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '13.5px', lineHeight: '1.6', resize: 'vertical', background: '#fff' }}></textarea></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#fff' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>조사_명령서_2026-0188.pdf</span><span style={{ fontSize: '11px', color: '#8494AC' }}>PDF · 0.4MB · 기관장 전자서명 포함</span></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>서명 유효</span></span>
                </div>
              </div>
            </div>
            </>) : null}

            {obIs2 ? (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>회사명</span><input placeholder="주식회사 예시제강" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사업자등록번호</span><input placeholder="000-00-00000" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>대표번호</span><input placeholder="02-0000-0000" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>홈페이지 URL <span style={{ fontWeight: '500', color: '#9AA8BE' }}>(선택)</span></span><input placeholder="https://" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
            </div>
            </>) : null}

            {obIs3 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ border: '1.5px dashed rgba(0,69,169,.34)', borderRadius: '16px', background: 'rgba(0,69,169,.035)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(0,69,169,.10)', display: 'grid', placeItems: 'center' }}><span style={{ width: '14px', height: '14px', background: '#0045A9', borderRadius: '3px' }}></span></span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>증빙서류를 업로드하세요</span>
                <span style={{ fontSize: '12px', color: '#6B7A93' }}>사업자등록증(필수) · 공장등록증 · 제3자 인증서 · PDF/JPG 20MB 이하</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(obDocs || []).map((f, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>{f.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{f.meta}</span></span>
                  <span style={f.chip}>{f.status}</span>
                  <button onClick={f.view} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv35">확인</button>
                  <button onClick={f.remove} title="삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv36"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
                </div>
                </React.Fragment>))}
              </div>
            </div>
            </>) : null}

            {obIs4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={obTier1} style={obTier1Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 1</span><span style={tier1Chip}>기초 / 셀프 등록</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>자체 선언 데이터만 입력하는 무료·기본 등급. 서류 심사 없이 즉시 사용할 수 있습니다.</span></button>
              <button onClick={obTier2} style={obTier2Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 2</span><span style={tier2Chip}>표준 / 검증 등록</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>ISO·ESG 등 제3자 인증서를 첨부해 데이터 신뢰도를 높인 등급. 자동심사 후 즉시 승인됩니다.</span></button>
              <button onClick={obTier3} style={obTier3Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 3</span><span style={tier3Chip}>엔터프라이즈 / Full DPP</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>공급망 하위 업체(Tier 2~4)까지 초대해 전체 추적망을 연동할 수 있는 최고 등급. 관리자 심사가 필요합니다.</span></button>
            </div>
            </>) : null}

            {obIs5 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>담당 업무에 필요한 권한을 신청하세요. 관리자 승인 후 즉시 적용됩니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>DPP 발급 · 수정</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>제품 데이터 입력 및 여권 발급</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>협력사 초대</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>하위 공급망 계정 초대 및 역할 부여</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>ZKP 증명 제출</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>영업기밀 비공개 증명 생성·제출</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>감사 로그 열람</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>자사 DPP 관련 감사 이력 조회</span></span></label>
              </div>
            </div>
            </>) : null}
          </div>

          <div style={{ padding: '18px 30px 22px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={obPrev} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>이전</button>
            <span style={{ fontSize: '12.5px', color: '#8494AC' }}>닫으면 마이페이지에서 이어서 작성할 수 있습니다</span>
            <button onClick={obNext} style={{ height: '46px', padding: '0 26px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>{obNextLabel}</button>
          </div>
        </div>
      </div>
      </>) : null}

      {fieldCheckOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '89', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeFieldCheck} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '620px', maxHeight: '100%', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>필수 필드 충족 현황</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{fieldFilledCount} / {fieldTotalCount}개 입력 완료 · 체크된 항목은 업로드 문서에서 자동 매핑되었습니다</span>
            </div>
            <button onClick={closeFieldCheck} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', margin: '22px 28px', borderRadius: '14px', overflow: 'auto' }}>
            {(fieldCheck || []).map((f, $index) => (<React.Fragment key={$index}>
            <div style={{ background: '#fff', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center' }}>
              <span style={f.dot}>{f.mark}</span>
              <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{f.label}</span>
              <span style={f.valueStyle}>{f.valueText}</span>
            </div>
            </React.Fragment>))}
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={closeFieldCheck} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      </div>
      </>) : null}

      {qrModalOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeQrModal} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.55)' }}></div>
        <div style={{ position: 'relative', width: '400px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 28px', gap: '16px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#12A150' }}></span>{qrModalBadge}</span>
          <span style={{ fontSize: '15px', fontWeight: '700', textAlign: 'center' }}>{qrModalTitle}</span>
          {qrModalImg ? (<img src={qrModalImg} alt="DPP QR" style={{ width: '200px', height: '200px', borderRadius: '14px', border: '1px solid rgba(16,32,64,.08)' }} />) : null}
          <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', fontWeight: '600', color: '#44546F' }}>{qrModalId}</span>
          {qrModalUrl ? (<span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11px', color: '#6B7A93', textAlign: 'center', wordBreak: 'break-all', lineHeight: '1.5' }}>{qrModalUrl}</span>) : null}
          {qrModalUrlWarning ? (
          <span style={{ fontSize: '11.5px', color: '#C22B2B', textAlign: 'center', lineHeight: '1.6' }}>{qrModalUrlWarning}</span>
          ) : null}
          {qrBaseEditing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <input value={qrBaseInput} onChange={qrBaseOnChange} placeholder="http://192.168.0.10" style={{ height: '40px', padding: '0 12px', border: '1px solid rgba(16,32,64,.16)', borderRadius: '10px', fontSize: '13px', fontFamily: '\'JetBrains Mono\',monospace' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={cancelQrBaseEditor} style={{ flex: 1, height: '38px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
              <button onClick={saveQrBase} style={{ flex: 1, height: '38px', border: '0', borderRadius: '10px', background: '#0045A9', color: '#fff', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }}>저장하고 QR 다시 만들기</button>
            </div>
          </div>
          ) : (
          <button onClick={openQrBaseEditor} style={{ border: '0', background: 'transparent', color: '#0045A9', fontSize: '11.5px', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}>공개 주소 변경</button>
          )}
          <span style={{ fontSize: '11.5px', color: '#8494AC', textAlign: 'center', lineHeight: '1.6' }}>{qrModalHint}</span>
          <div style={{ display: 'flex', gap: '9px', width: '100%' }}>
            <button onClick={closeQrModal} style={{ flex: 1, height: '44px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>닫기</button>
            {qrModalShowLink ? (<>
            <button onClick={goToProductsFromQr} style={{ flex: 1, height: '44px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>제품 조회에서 보기</button>
            </>) : null}
          </div>
        </div>
      </div>
      </>) : null}

      {memberModalOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeMemberModal} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.55)' }}></div>
        <div style={{ position: 'relative', width: '460px', maxHeight: '80vh', overflowY: 'auto', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', padding: '26px 28px', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '600', color: '#0045A9' }}>회원 상세</span>
            <span style={{ fontSize: '19px', fontWeight: '700' }}>{memberModalName}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {(memberModalRows || []).map((r) => (
              <div key={r.key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '12px', padding: '11px 0', borderTop: '1px solid rgba(16,32,64,.07)', alignItems: 'baseline' }}>
                <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>{r.label}</span>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#0B1B33', wordBreak: 'break-all', fontFamily: r.mono ? '\'JetBrains Mono\',monospace' : 'inherit' }}>{r.value}</span>
              </div>
            ))}
          </div>
          <button onClick={closeMemberModal} style={{ height: '44px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
      </>) : null}

      {rejectModalOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '89', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeRejectModal} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '520px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>문서 반려 관리</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{rejectModalName} 가입 신청 반려</span>
            </div>
            <button onClick={closeRejectModal} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(rejectReasonPresets || []).map((p, $index) => (<React.Fragment key={$index}>
              <button onClick={p.apply} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#F7F9FD', color: '#44546F', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>{p.label}</button>
              </React.Fragment>))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>반려 사유</span>
              <textarea value={rejectReasonInput} onChange={setRejectReasonInput} rows={4} placeholder="반려 사유를 입력해 주세요(비워두면 기본 사유로 처리됩니다)" style={{ padding: '12px 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '13.5px', resize: 'vertical', fontFamily: 'inherit' }} />
            </label>
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end', gap: '9px' }}>
            <button onClick={closeRejectModal} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
            <button onClick={confirmReject} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#C22B2B', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(224,59,59,.24)' }}>반려 처리</button>
          </div>
        </div>
      </div>
      </>) : null}

      {profileEditOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={cancelProfileEdit} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '620px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>기업 기본정보 수정</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>변경한 내용은 저장 후 즉시 반영됩니다.</span>
            </div>
            <button onClick={cancelProfileEdit} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>회사명</span><input value={editName} onChange={onEditName} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사업자등록번호</span><input value={editBiz} onChange={onEditBiz} disabled={editBizReadOnly} title={editBizReadOnly ? '사업자등록번호는 가입 시 확정되며 여기서 변경할 수 없습니다.' : undefined} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace', background: editBizReadOnly ? '#F7F9FD' : '#fff', color: editBizReadOnly ? '#8494AC' : 'inherit' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>대표번호</span><input value={editPhone} onChange={onEditPhone} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>홈페이지 URL <span style={{ fontWeight: '500', color: '#9AA8BE' }}>(선택)</span></span><input value={editUrl} onChange={onEditUrl} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end', gap: '9px' }}>
            <button onClick={cancelProfileEdit} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
            <button onClick={commitProfileEdit} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' }}>저장</button>
          </div>
        </div>
      </div>
      </>) : null}

      {docPreviewOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeDocPreview} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '680px', maxHeight: '100%', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '17px', fontWeight: '700' }}>{docPreviewName}</span>
              <span style={{ fontSize: '12px', color: '#8494AC' }}>{docPreviewMeta}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={docPreviewChip}>{docPreviewStatus}</span>
              <button onClick={closeDocPreview} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ padding: '26px', background: '#EEF2F9', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: '400px', height: '300px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(11,27,51,.12)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ height: '14px', width: '55%', borderRadius: '3px', background: '#0B1B33' }}></div>
              <div style={{ height: '8px', width: '82%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '74%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '88%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '1px', background: 'rgba(16,32,64,.12)', margin: '4px 0' }}></div>
              <div style={{ height: '8px', width: '64%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '79%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '48%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ height: '8px', width: '30%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
                <div style={{ width: '52px', height: '52px', borderRadius: '999px', border: '2px solid rgba(224,59,59,.42)' }}></div>
              </div>
            </div>
          </div>
          <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#8494AC' }}>1 / 1 페이지</span>
            <div style={{ display: 'flex', gap: '9px' }}>
              <button onClick={downloadDoc} style={{ height: '44px', padding: '0 18px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>원본 내려받기</button>
              <button onClick={closeDocPreview} style={{ height: '44px', padding: '0 22px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {confirmOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '88', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={confirmCancel} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.48)' }}></div>
        <div style={{ position: 'relative', width: '440px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.30)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>{confirmTitle}</span>
          <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>{confirmBody}</p>
          <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end', paddingTop: '6px' }}>
            <button onClick={confirmCancel} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
            <button onClick={confirmRun} style={confirmStyle}>{confirmLabel}</button>
          </div>
        </div>
      </div>
      </>) : null}

      {toast ? (<>
      <div style={{ position: 'fixed', left: '50%', bottom: '92px', transform: 'translateX(-50%)', zIndex: '90', display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '13px', background: '#0B1B33', color: '#fff', fontSize: '13.5px', fontWeight: '500', boxShadow: '0 12px 30px rgba(11,27,51,.32)', animation: 'ieumUp .18s ease-out' }}><span style={{ width: '7px', height: '7px', borderRadius: '4px', background: '#4ADE80' }}></span>{toast}</div>
      </>) : null}

      </div>

    </>
  );
}
