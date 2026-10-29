import { cn } from './ui.jsx';

/** Printed order-ticket paper. The shadow sits on the wrapper so the zigzag tear keeps it. */
export function Ticket({ children, className, print }) {
  return (
    <div className={cn('ticket-shadow', className)}>
      <div className={cn('ticket px-5 pt-5 font-mono text-[13px] leading-relaxed text-ink-900', print && 'animate-print')}>
        {children}
      </div>
    </div>
  );
}

export const TicketRule = () => <div className="my-3 border-t border-dashed border-ink-900/35" aria-hidden />;

export function TicketLine({ left, right, strong, className }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3', strong && 'text-[15px] font-medium', className)}>
      <span className="min-w-0">{left}</span>
      <span className="shrink-0 tabular-nums">{right}</span>
    </div>
  );
}
