import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import Toast from '../components/Toast.jsx';
import ConfirmSheet from '../components/ConfirmSheet.jsx';

const UiContext = createContext(null);

export function UiProvider({ children }) {
  const [toast, setToast] = useState('');
  const [confirm, setConfirm] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((message, duration = 2800) => {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), duration);
  }, []);

  // await confirmAction({...}) → true / false
  const confirmAction = useCallback(
    (options) =>
      new Promise((resolve) => {
        setConfirm({ ...options, resolve });
      }),
    []
  );

  const close = useCallback(
    (result) => {
      confirm?.resolve?.(result);
      setConfirm(null);
    },
    [confirm]
  );

  const value = useMemo(() => ({ showToast, confirmAction }), [showToast, confirmAction]);

  return (
    <UiContext.Provider value={value}>
      {children}
      {confirm ? <ConfirmSheet {...confirm} onConfirm={() => close(true)} onCancel={() => close(false)} /> : null}
      <Toast message={toast} />
    </UiContext.Provider>
  );
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) throw new Error('useUi must be used inside <UiProvider>');
  return ctx;
}
