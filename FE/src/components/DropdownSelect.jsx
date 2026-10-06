import React, { useEffect, useRef, useState } from 'react';

/**
 * 항상 아래로 펼쳐지는 드롭다운(2026-10-06 강 요청).
 *
 * 네이티브 <select>는 목록을 어느 방향으로 펼칠지 브라우저가 정한다 - 아래쪽 공간이 모자라면
 * 위로 뒤집혀 열려서, 협력사 초대 폼처럼 화면 아래쪽에 있는 칸에서는 목록이 입력칸 위를
 * 덮고 올라갔다. 이 컴포넌트는 목록을 입력칸 바로 아래에 붙여 그리고, 길면 목록 안에서
 * 스크롤한다(페이지가 아니라). 열 때 목록이 화면 밖으로 잘리면 페이지를 그만큼만 내려준다.
 *
 * onChange는 네이티브 select와 같은 모양({ target: { value } })으로 부른다 - 기존 뷰모델
 * 핸들러(e => e.target.value)를 그대로 쓰기 위함.
 *
 * props:
 *   value, onChange, placeholder, disabled
 *   options: [{ value, label }]          - 평평한 목록
 *   groups:  [{ key, label, options }]   - 묶음 목록(둘 중 하나만)
 *   style:   트리거 버튼 스타일 덮어쓰기
 */
export default function DropdownSelect({ value, onChange, options, groups, placeholder, disabled, style }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const sections = groups && groups.length ? groups : [{ key: '_', label: null, options: options || [] }];
  const flat = sections.flatMap(g => g.options);
  const current = flat.find(o => String(o.value) === String(value ?? ''));

  useEffect(() => {
    if (!open) return undefined;
    const onDown = e => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    // 목록이 화면 아래로 잘리면 페이지를 필요한 만큼만 내린다 - 위로 뒤집지 않는다.
    const el = listRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const overflow = r.bottom - window.innerHeight + 16;
      if (overflow > 0) window.scrollBy({ top: overflow, behavior: 'smooth' });
      const sel = el.querySelector('[data-selected="true"]');
      if (sel) sel.scrollIntoView({ block: 'nearest' });
    }
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = v => {
    setOpen(false);
    if (onChange) onChange({ target: { value: v } });
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', height: '44px', padding: '0 36px 0 12px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '11px',
          fontSize: '14px', background: disabled ? '#F7F9FD' : '#fff', color: current ? '#0B1B33' : '#8494AC',
          textAlign: 'left', cursor: disabled ? 'default' : 'pointer', position: 'relative', whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          ...(open ? { borderColor: '#0045A9', boxShadow: '0 0 0 3px rgba(0,69,169,.10)' } : null),
          ...style
        }}
      >
        {current ? current.label : (placeholder || '선택하세요')}
        <span style={{ position: 'absolute', right: '14px', top: '50%', transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)', fontSize: '10px', color: '#6B7A93' }}>▼</span>
      </button>
      {open ? (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 50, maxHeight: '280px', overflowY: 'auto',
            background: '#fff', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px',
            boxShadow: '0 12px 28px rgba(11,27,51,.14)', padding: '6px'
          }}
        >
          {flat.length === 0 ? (
            <div style={{ padding: '12px', fontSize: '13px', color: '#8494AC' }}>선택할 항목이 없습니다</div>
          ) : sections.map(g => (
            <div key={g.key}>
              {g.label ? (<div style={{ padding: '8px 10px 4px', fontSize: '11.5px', fontWeight: 600, color: '#8494AC' }}>{g.label}</div>) : null}
              {g.options.map(o => {
                const selected = String(o.value) === String(value ?? '');
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    data-selected={selected ? 'true' : 'false'}
                    onClick={() => pick(o.value)}
                    style={{
                      display: 'block', width: '100%', padding: '9px 10px', border: 0, borderRadius: '8px', textAlign: 'left',
                      fontSize: '13.5px', cursor: 'pointer', color: '#0B1B33',
                      background: selected ? 'rgba(0,69,169,.08)' : 'transparent', fontWeight: selected ? 600 : 400
                    }}
                    onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#F2F6FC'; }}
                    onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
