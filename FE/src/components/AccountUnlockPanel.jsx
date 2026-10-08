import React, { useState } from 'react';
import { requestUnlockCode, verifyUnlockCode } from '../api/authApi.js';

/**
 * 로그인 5회 실패로 잠긴 계정을 이메일 인증으로 푸는 카드(2026-10-08, 개발보고서
 * "로그인 5회 실패 시 계정을 잠그고 이메일 재인증으로 풀도록 했다").
 * 로그인 화면·초대 로그인 화면이 423을 받으면 이 카드를 띄운다.
 */
export default function AccountUnlockPanel({ email, onUnlocked, onClose }) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function send() {
    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await requestUnlockCode(email);
      setSent(true);
      if (res && res.devCode) {
        setCode(res.devCode);
        setMsg('메일 미설정 환경이라 인증코드(' + res.devCode + ')를 자동으로 채웠습니다.');
      } else {
        setMsg(email + ' 로 인증코드를 보냈습니다. 10분 안에 입력해 주세요.');
      }
    } catch (e) {
      setErr(e.message || '인증코드를 보내지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    if (!code.trim()) { setErr('인증코드를 입력해 주세요.'); return; }
    setBusy(true); setErr('');
    try {
      await verifyUnlockCode(email, code.trim());
      onUnlocked?.();
    } catch (e) {
      setErr(e.message || '잠금을 해제하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  const btn = { height: '44px', padding: '0 16px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', borderRadius: '14px', background: 'rgba(224,59,59,.05)', border: '1px solid rgba(224,59,59,.22)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: '700', color: '#C22B2B' }}>계정이 잠겼습니다</span>
        {onClose ? (<button type="button" onClick={onClose} style={{ border: '0', background: 'transparent', color: '#8494AC', fontSize: '13px', cursor: 'pointer' }}>닫기</button>) : null}
      </div>
      <span style={{ fontSize: '12.5px', color: '#44546F', lineHeight: '1.55' }}>로그인에 5회 실패해 계정이 잠겼습니다. 가입한 이메일({email})로 인증코드를 받아 잠금을 해제해 주세요.</span>
      {!sent ? (
        <button type="button" onClick={send} disabled={busy} style={btn}>{busy ? '보내는 중…' : '이메일로 인증코드 받기'}</button>
      ) : (
        <div style={{ display: 'flex', gap: '8px' }}>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6자리 인증코드" inputMode="numeric" maxLength={6} style={{ flex: '1', height: '44px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', letterSpacing: '.12em' }} />
          <button type="button" onClick={verify} disabled={busy} style={btn}>{busy ? '확인 중…' : '잠금 해제'}</button>
          <button type="button" onClick={send} disabled={busy} style={{ ...btn, background: '#fff', color: '#0045A9', border: '1px solid rgba(0,69,169,.24)' }}>재발송</button>
        </div>
      )}
      {msg ? (<span style={{ fontSize: '12px', color: '#0045A9' }}>{msg}</span>) : null}
      {err ? (<span style={{ fontSize: '12px', color: '#C22B2B' }}>{err}</span>) : null}
    </div>
  );
}
