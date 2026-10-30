import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, matchPath } from 'react-router-dom';
import { Send, Sparkles, X } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { callAi } from '../lib/ai.js';
import ProductCard from './ProductCard.jsx';
import { cn } from './ui.jsx';

const IDEAS = ['Something iced under ₱150', 'Best for a sweet tooth', 'A light snack with coffee', 'What’s good right now?'];
const WELCOME = { role: 'assistant', text: 'Hi! Tell me what you’re craving and I’ll find it on the menu.', picks: [] };

/** Floating helper that recommends real products from the live menu. */
export default function CoffeeAssistant() {
  const { session, user } = useAuth();
  const { pathname } = useLocation();
  const shopId = matchPath('/shops/:id', pathname)?.params.id;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([WELCOME]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => {
    if (open) end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy, open]);

  if (pathname === '/login' || pathname === '/cart') return null;

  async function send(q) {
    const question = (q ?? text).trim();
    if (!question || busy) return;
    const next = [...msgs, { role: 'user', text: question }];
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      const out = await callAi({ mode: 'chat', shopId, messages: next.filter((m) => m !== WELCOME).map(({ role, text: t }) => ({ role, text: t })) });
      let picks = [];
      if (out.product_ids.length) {
        const { data: products } = await supabase.from('products').select('*').in('id', out.product_ids);
        const { data: shops } = await supabase.from('shops').select('*').in('id', [...new Set((products ?? []).map((p) => p.shop_id))]);
        const byShop = new Map((shops ?? []).map((s) => [s.id, s]));
        picks = out.product_ids.map((id) => (products ?? []).find((p) => p.id === id)).filter((p) => p && byShop.has(p.shop_id)).map((p) => ({ product: p, shop: byShop.get(p.shop_id) }));
      }
      setMsgs([...next, { role: 'assistant', text: out.reply, picks }]);
    } catch (e) {
      setMsgs([...next, { role: 'assistant', text: e.message, picks: [], error: true }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-4 bottom-20 z-40 inline-flex h-12 items-center gap-2 rounded-full bg-ink-900 px-5 text-sm font-semibold text-foam shadow-xl hover:bg-ink-700 lg:bottom-6"
        >
          <Sparkles className="size-4 text-kraft-300" aria-hidden /> Ask AI
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Coffee assistant"
          className="animate-rise fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-2xl border border-ink-900/12 bg-foam shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[24rem] sm:rounded-2xl"
        >
          <header className="flex items-center justify-between border-b border-ink-900/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-ink-900 text-kraft-300"><Sparkles className="size-4" aria-hidden /></span>
              <div>
                <p className="font-display text-base leading-tight font-bold">Coffee assistant</p>
                <p className="text-xs text-ink-600">{shopId ? 'Looking at this shop’s menu' : 'Searching all open shops'}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-md p-1.5 hover:bg-ink-900/6"><X className="size-5" /></button>
          </header>

          {!session ? (
            <div className="p-6 text-center">
              <p className="font-semibold">Log in to ask for recommendations.</p>
              <Link to="/login" onClick={() => setOpen(false)} className="mt-4 inline-flex h-11 items-center rounded-lg bg-ink-900 px-5 text-sm font-semibold text-foam">Log in or sign up</Link>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {msgs.map((m, i) => (
                  <div key={i} className={cn('flex flex-col gap-2', m.role === 'user' ? 'items-end' : 'items-start')}>
                    <p className={cn('max-w-[88%] rounded-2xl px-3.5 py-2 text-[15px]', m.role === 'user' ? 'bg-ink-900 text-foam' : m.error ? 'bg-cherry-100 text-cherry-600' : 'bg-ink-900/6')}>{m.text}</p>
                    {m.picks?.length > 0 && (
                      <ul className="grid w-full grid-cols-2 gap-2">
                        {m.picks.map(({ product, shop }) => (
                          <ProductCard key={product.id} shop={shop} product={product} showShop isOwnShop={shop.owner_id === user?.id} />
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {busy && <p className="text-sm text-ink-600">Looking at the menu…</p>}
                {msgs.length === 1 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {IDEAS.map((i) => (
                      <button key={i} onClick={() => send(i)} className="rounded-full border border-ink-900/18 px-3 py-1.5 text-[13px] font-medium hover:border-ink-900/50">{i}</button>
                    ))}
                  </div>
                )}
                <div ref={end} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 border-t border-ink-900/10 p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={300}
                  placeholder="e.g. a cold drink, not too sweet"
                  aria-label="Message the assistant"
                  className="min-w-0 flex-1 rounded-lg border border-ink-900/18 bg-foam px-3.5 py-2.5 text-[15px] focus:border-ink-900 focus:outline-none"
                />
                <button disabled={busy || !text.trim()} aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-lg bg-cherry-500 text-white hover:bg-cherry-600 disabled:opacity-45"><Send className="size-4" /></button>
              </form>
              <p className="px-4 pb-3 text-[11px] text-ink-500">AI suggestions can be wrong. Check prices before you order.</p>
            </>
          )}
        </section>
      )}
    </>
  );
}
