import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Loader2, Star, X } from 'lucide-react';

export const cn = (...parts) => parts.filter(Boolean).join(' ');

/* ---------- Buttons ------------------------------------------------ */

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45';
const variants = {
  primary: 'bg-cherry-500 text-white hover:bg-cherry-600',
  dark: 'bg-ink-900 text-foam hover:bg-ink-700',
  outline: 'border border-ink-900/20 bg-foam text-ink-900 hover:border-ink-900/50',
  ghost: 'text-ink-700 hover:bg-ink-900/6',
  danger: 'border border-cherry-500/40 bg-foam text-cherry-600 hover:bg-cherry-100',
};
const sizes = { sm: 'h-9 px-3.5 text-sm', md: 'h-11 px-5 text-sm', lg: 'h-13 px-7 text-base' };

/** Class string for anything that should look like a button (e.g. a Link). */
export const btn = (variant = 'dark', size = 'md', extra = '') =>
  cn(base, variants[variant], sizes[size], extra);

export function Button({ variant = 'dark', size = 'md', loading, className, children, disabled, ...props }) {
  return (
    <button className={btn(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function LinkButton({ to, variant, size, className, children, ...props }) {
  return (
    <Link to={to} className={btn(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}

/* ---------- Form controls ----------------------------------------- */

export const inputCls =
  'w-full rounded-lg border border-ink-900/18 bg-foam px-3.5 py-2.5 text-[15px] text-ink-900 placeholder:text-ink-500 transition-colors focus:border-ink-900 focus:outline-none focus-visible:outline-none focus:ring-3 focus:ring-kraft-300/70 disabled:bg-steam-200';

export function Field({ label, hint, error, className, children }) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-ink-800">{label}</span>
      {children}
      {hint && !error && <span className="mt-1.5 block text-[13px] text-ink-600">{hint}</span>}
      {error && <span className="mt-1.5 block text-[13px] text-cherry-600">{error}</span>}
    </label>
  );
}

export const Input = ({ className, ...p }) => <input className={cn(inputCls, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cn(inputCls, 'resize-y', className)} {...p} />;
export const Select = ({ className, children, ...p }) => (
  <select className={cn(inputCls, 'pr-8', className)} {...p}>
    {children}
  </select>
);

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-moss-600' : 'bg-ink-900/25'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-foam shadow transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  );
}

/* ---------- Surfaces ---------------------------------------------- */

export const Panel = ({ className, ...p }) => (
  <div className={cn('rounded-xl border border-ink-900/12 bg-foam', className)} {...p} />
);

const tones = {
  neutral: 'bg-ink-900/7 text-ink-700',
  success: 'bg-moss-100 text-moss-600',
  warn: 'bg-kraft-200 text-ink-800',
  danger: 'bg-cherry-100 text-cherry-600',
  dark: 'bg-ink-900 text-foam',
};
export const Badge = ({ tone = 'neutral', className, children }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold', tones[tone], className)}>
    {children}
  </span>
);

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-lg bg-ink-900/8', className)} />;

export function EmptyState({ icon: Icon = Coffee, title, children, action }) {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-full bg-kraft-200 text-ink-800">
        <Icon className="size-5" aria-hidden />
      </div>
      <h3 className="font-display text-xl font-bold">{title}</h3>
      {children && <p className="mt-1.5 text-[15px] text-ink-600">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeading({ title, children, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">{title}</h1>
        {children && <p className="mt-2 max-w-xl text-ink-600">{children}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Menu-board row: name ........ value. */
export function Leader({ left, right, className }) {
  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className="min-w-0">{left}</span>
      <span aria-hidden className="mb-[5px] min-w-4 flex-1 border-b-2 border-dotted border-ink-900/25" />
      <span className="shrink-0">{right}</span>
    </div>
  );
}

/* ---------- Ratings ----------------------------------------------- */

export function Stars({ value = 0, size = 'size-4' }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(size, n <= Math.round(value) ? 'fill-kraft-400 text-kraft-400' : 'text-ink-900/20')}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange(n)}
          className="rounded p-0.5"
        >
          <Star className={cn('size-8', n <= value ? 'fill-kraft-400 text-kraft-400' : 'text-ink-900/25')} />
        </button>
      ))}
    </div>
  );
}

/* ---------- Modal -------------------------------------------------- */

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink-950/55 p-0 sm:place-items-center sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          'animate-rise max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-foam p-6 shadow-2xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-md'
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="-m-1 rounded-md p-1 text-ink-600 hover:bg-ink-900/6">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Segmented tabs ---------------------------------------- */

export function Tabs({ value, onChange, items }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-ink-900/7 p-1">
      {items.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors',
            value === t.id ? 'bg-foam text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900'
          )}
        >
          {t.label}
          {t.count > 0 && (
            <span className="ml-1.5 rounded bg-cherry-500 px-1.5 py-px text-[11px] text-white">{t.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Image with a coffee fallback -------------------------- */

export function Thumb({ src, alt = '', className, iconClass = 'size-5' }) {
  return (
    <div className={cn('grid shrink-0 place-items-center overflow-hidden bg-kraft-200 text-ink-700', className)}>
      {src ? <img src={src} alt={alt} loading="lazy" className="size-full object-cover" /> : <Coffee className={iconClass} aria-hidden />}
    </div>
  );
}
