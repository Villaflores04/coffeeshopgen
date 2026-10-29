import { Check } from 'lucide-react';
import { ORDER_LABEL, ORDER_STEPS } from '../lib/config.js';
import { cn } from './ui.jsx';

/** Seven-step delivery tracker. Scrolls sideways on narrow screens. */
export default function OrderTracker({ status }) {
  const current = ORDER_STEPS.indexOf(status);

  return (
    <div className="-mx-1 overflow-x-auto px-1 pb-1">
      <ol className="flex min-w-[32rem]" aria-label="Order progress">
        {ORDER_STEPS.map((step, i) => {
          const done = i < current || status === 'delivered';
          const active = i === current && status !== 'delivered';
          return (
            <li key={step} className="relative flex flex-1 flex-col items-center text-center" aria-current={active ? 'step' : undefined}>
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn('absolute top-3 right-1/2 h-0.5 w-full', i <= current ? 'bg-moss-600' : 'bg-ink-900/15')}
                />
              )}
              <span
                className={cn(
                  'relative z-10 grid size-6 place-items-center rounded-full border-2 transition-colors',
                  done && 'border-moss-600 bg-moss-600 text-white',
                  active && 'border-cherry-500 bg-foam',
                  !done && !active && 'border-ink-900/20 bg-foam'
                )}
              >
                {done ? <Check className="size-3.5" strokeWidth={3} /> : active && <span className="size-2 animate-pulse rounded-full bg-cherry-500" />}
              </span>
              <span className={cn('mt-2 px-1 text-xs leading-tight', active ? 'font-semibold text-ink-900' : done ? 'text-ink-700' : 'text-ink-600')}>
                {ORDER_LABEL[step]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
