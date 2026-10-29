import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { useToast } from '../lib/ToastContext.jsx';
import { uploadImage } from '../lib/storage.js';
import { errMsg } from '../lib/format.js';
import { cn } from './ui.jsx';

/** Click-to-upload image field that stores files in Supabase Storage. */
export default function ImageUpload({ label, value, onChange, shape = 'wide', className }) {
  const { user } = useAuth();
  const toast = useToast();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadImage(file, user.id));
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      <div
        className={cn(
          'group relative overflow-hidden rounded-lg border border-dashed border-ink-900/30 bg-steam-50',
          shape === 'wide' && 'aspect-[16/6]',
          shape === 'square' && 'aspect-square max-w-40'
        )}
      >
        {value ? (
          <>
            <img src={value} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              aria-label={`Remove ${label.toLowerCase()}`}
              className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-ink-900/80 text-foam hover:bg-ink-900"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex size-full flex-col items-center justify-center gap-1.5 text-sm text-ink-600 hover:bg-steam-100"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {busy ? 'Uploading…' : 'Upload a photo'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" />
    </div>
  );
}
