import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info };
const DEFAULT_MS = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (type, title, description, duration = DEFAULT_MS) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, type, title, description }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
      return id;
    },
    [dismiss],
  );

  const toast = useMemo(
    () => ({
      success: (title, description) => push('success', title, description),
      error: (title, description) => push('error', title, description, 7000),
      info: (title, description) => push('info', title, description),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/*
        Assertive so errors interrupt; the region exists even when empty so
        screen readers have something to observe from first paint.
      */}
      <div className="toast-region" role="region" aria-label="Notifications">
        {toasts.map((item) => {
          const Icon = ICONS[item.type] ?? Info;
          return (
            <output
              key={item.id}
              className={`toast toast--${item.type}`}
              aria-live={item.type === 'error' ? 'assertive' : 'polite'}
            >
              <Icon className="toast__icon" size={18} aria-hidden="true" />
              <div className="toast__body">
                <strong>{item.title}</strong>
                {item.description && <span>{item.description}</span>}
              </div>
              <button
                type="button"
                className="icon-btn icon-btn--sm"
                onClick={() => dismiss(item.id)}
                aria-label={`Dismiss: ${item.title}`}
              >
                <X size={15} />
              </button>
            </output>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext);
