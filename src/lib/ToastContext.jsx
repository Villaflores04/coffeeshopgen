import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Check, TriangleAlert } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const push = useCallback((type, message) => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-ink-900 px-4 py-3 text-sm font-medium text-foam shadow-xl"
          >
            {t.type === 'success' ? (
              <Check className="size-4 shrink-0 text-moss-100" aria-hidden />
            ) : (
              <TriangleAlert className="size-4 shrink-0 text-kraft-300" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
