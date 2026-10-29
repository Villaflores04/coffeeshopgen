import { createContext, useCallback, useContext, useState } from 'react';
import { Button, Modal, Textarea } from '../components/ui.jsx';

const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * const res = await confirm({ title, message, confirmText, danger, input: { label, required } });
 * res is null when cancelled, otherwise { value } (the typed text, when `input` is set).
 */
export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const [text, setText] = useState('');

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setText('');
        setState({ opts, resolve });
      }),
    []
  );

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  const opts = state?.opts ?? {};
  const blocked = opts.input?.required && !text.trim();

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(state)} onClose={() => close(null)} title={opts.title ?? ''}>
        {opts.message && <p className="text-[15px] text-ink-700">{opts.message}</p>}
        {opts.input && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium">{opts.input.label}</span>
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </label>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => close(null)}>
            Cancel
          </Button>
          <Button variant={opts.danger ? 'danger' : 'dark'} disabled={blocked} onClick={() => close({ value: text.trim() })}>
            {opts.confirmText ?? 'Confirm'}
          </Button>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
