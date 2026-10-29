import { useEffect, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { useToast } from '../lib/ToastContext.jsx';
import { PESOS_PER_POINT_EARNED, REFERRAL_BONUS, REFERRAL_MIN_ORDER } from '../lib/config.js';
import { timeAgo } from '../lib/format.js';
import { Badge, Button, PageHeading, Skeleton, cn } from '../components/ui.jsx';

/** A paper punch card. Every 10 points punches a hole; a full card is 100 points. */
function PunchCard({ balance }) {
  const into = balance % 100;
  const punched = Math.floor(into / 10);
  return (
    <div className="rounded-2xl bg-kraft-300 p-6 text-ink-950 sm:p-8">
      <p className="font-display text-lg font-bold">Your points</p>
      <p className="mt-1 font-display text-7xl leading-none font-extrabold tracking-tight tabular-nums sm:text-8xl">{balance}</p>
      <p className="mt-2 text-[15px] font-medium">Worth ₱{balance} off your next orders.</p>

      <div className="mt-8 grid grid-cols-5 gap-3 sm:gap-4" role="img" aria-label={`${punched} of 10 punches toward the next 100 points`}>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={cn(
              'grid aspect-square place-items-center rounded-full border-2 border-dashed border-ink-950/45',
              i < punched && 'border-solid border-ink-950 bg-ink-950 text-kraft-300'
            )}
          >
            {i < punched && <Check className="size-4" strokeWidth={3} aria-hidden />}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm">{100 - into} points to your next full card.</p>
    </div>
  );
}

export default function Rewards() {
  const { profile } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    supabase
      .from('reward_points')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, []);

  const { balance, pending } = useMemo(() => {
    const r = rows ?? [];
    return {
      balance: r.filter((x) => x.status === 'confirmed').reduce((s, x) => s + x.points, 0),
      pending: r.filter((x) => x.status === 'pending').reduce((s, x) => s + x.points, 0),
    };
  }, [rows]);

  const link = `${window.location.origin}/login?ref=${profile?.referral_code ?? ''}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Couldn’t copy. Select the link and copy it by hand.');
    }
  }

  return (
    <div className="pt-8 sm:pt-12">
      <PageHeading title="Rewards">Points come with every order and take money off the next one.</PageHeading>

      {rows === null ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-6">
            <PunchCard balance={balance} />
            {pending > 0 && (
              <p className="rounded-lg bg-foam px-4 py-3 text-sm text-ink-700 ring-1 ring-ink-900/12">
                <strong>{pending} points</strong> are waiting on orders that haven’t been delivered yet.
              </p>
            )}

            <section className="rounded-xl border border-ink-900/12 bg-foam p-6">
              <h2 className="font-display text-2xl font-bold">Invite a friend</h2>
              <p className="mt-1.5 text-[15px] text-ink-700">
                When they sign up with your link and get their first order of ₱{REFERRAL_MIN_ORDER} or more delivered, you each get {REFERRAL_BONUS} points. You can earn up to 10 invite bonuses a month.
              </p>
              <div className="mt-4 flex gap-2">
                <input readOnly value={link} aria-label="Your invite link" onFocus={(e) => e.target.select()} className="min-w-0 flex-1 rounded-lg border border-ink-900/18 bg-steam-50 px-3 font-mono text-[13px]" />
                <Button variant="dark" onClick={copy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? 'Copied' : 'Copy link'}
                </Button>
              </div>
              <p className="mt-3 text-sm text-ink-600">Your code: <span className="font-mono font-medium">{profile?.referral_code}</span></p>
            </section>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">History</h2>
            <p className="mt-1 text-sm text-ink-600">You earn 1 point for every ₱{PESOS_PER_POINT_EARNED} you pay.</p>
            {rows.length === 0 ? (
              <p className="mt-8 text-ink-700">No points yet. Your first order starts the card.</p>
            ) : (
              <ul className="mt-4 divide-y divide-ink-900/10 border-y border-ink-900/10">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3.5">
                    <div>
                      <p className="text-[15px] font-medium">{r.note}</p>
                      <p className="text-sm text-ink-600">{timeAgo(r.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      {r.status === 'pending' && <Badge tone="warn">Pending</Badge>}
                      {r.status === 'void' && <Badge>Voided</Badge>}
                      <span className={cn('font-mono text-lg font-medium tabular-nums', r.points < 0 ? 'text-ink-700' : 'text-moss-600', r.status === 'void' && 'line-through opacity-50')}>
                        {r.points > 0 ? '+' : ''}{r.points}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
