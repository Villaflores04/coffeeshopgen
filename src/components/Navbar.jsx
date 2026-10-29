import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, ShoppingBag, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { useCart } from '../lib/CartContext.jsx';
import { btn, cn } from './ui.jsx';

export function Logo({ className }) {
  return (
    <Link to="/" className={cn('flex items-center gap-2.5', className)} aria-label="CoffeeShopGen home">
      <svg viewBox="0 0 64 64" className="size-8" aria-hidden>
        <rect width="64" height="64" rx="14" fill="#12201C" />
        <path d="M16 26h26v10a13 13 0 0 1-13 13h0a13 13 0 0 1-13-13V26z" fill="#FCFCFA" />
        <path d="M42 29h4a5 5 0 0 1 0 10h-4" fill="none" stroke="#FCFCFA" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="29" cy="15" r="3.2" fill="#D13B3B" />
      </svg>
      <span className="font-display text-xl font-extrabold tracking-tight">CoffeeShopGen</span>
    </Link>
  );
}

const linkCls = ({ isActive }) =>
  cn('rounded-md px-3 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-ink-900/8 text-ink-900' : 'text-ink-700 hover:text-ink-900');

function AccountMenu() {
  const { profile, role, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const first = (profile?.full_name || 'Account').split(' ')[0];
  const item = 'block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink-900/6';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-ink-900/18 bg-foam px-3 text-sm font-semibold hover:border-ink-900/40"
      >
        {first}
        <ChevronDown className="size-4" aria-hidden />
      </button>
      {open && (
        <div className="animate-rise absolute right-0 mt-2 w-52 rounded-xl border border-ink-900/12 bg-foam p-1.5 shadow-xl" onClick={() => setOpen(false)}>
          <Link to="/orders" className={item}>My orders</Link>
          <Link to="/rewards" className={item}>Rewards</Link>
          <Link to="/owner" className={item}>{role === 'owner' || role === 'admin' ? 'My shop' : 'Open a shop'}</Link>
          {role === 'admin' && <Link to="/admin" className={item}>Admin</Link>}
          <button
            className={cn(item, 'flex items-center gap-2 text-cherry-600')}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            <LogOut className="size-4" aria-hidden /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { session } = useAuth();
  const { count } = useCart();
  const [sheet, setSheet] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-steam-100/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Logo />
          <div className="hidden items-center gap-1 md:flex">
            <NavLink to="/" end className={linkCls}>Shops</NavLink>
            {session && <NavLink to="/orders" className={linkCls}>Orders</NavLink>}
            {session && <NavLink to="/rewards" className={linkCls}>Rewards</NavLink>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/cart')}
            aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
            className="relative grid size-10 place-items-center rounded-lg hover:bg-ink-900/6"
          >
            <ShoppingBag className="size-5" aria-hidden />
            {count > 0 && (
              <span className="absolute top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-cherry-500 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>

          <div className="hidden md:block">
            {session ? <AccountMenu /> : <Link to="/login" className={btn('dark', 'sm')}>Log in</Link>}
          </div>

          <button className="grid size-10 place-items-center rounded-lg hover:bg-ink-900/6 md:hidden" aria-label={sheet ? 'Close menu' : 'Open menu'} onClick={() => setSheet(!sheet)}>
            {sheet ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {sheet && (
        <div className="animate-rise border-t border-ink-900/10 bg-steam-100 px-4 pb-4 md:hidden" onClick={() => setSheet(false)}>
          <MobileLinks />
        </div>
      )}
    </header>
  );
}

function MobileLinks() {
  const { session, role, signOut } = useAuth();
  const navigate = useNavigate();
  const item = 'block rounded-md px-3 py-3 text-base font-semibold hover:bg-ink-900/6';
  return (
    <div className="pt-2">
      <Link to="/" className={item}>Shops</Link>
      {session ? (
        <>
          <Link to="/orders" className={item}>My orders</Link>
          <Link to="/rewards" className={item}>Rewards</Link>
          <Link to="/owner" className={item}>{role === 'owner' || role === 'admin' ? 'My shop' : 'Open a shop'}</Link>
          {role === 'admin' && <Link to="/admin" className={item}>Admin</Link>}
          <button
            className={cn(item, 'w-full text-left text-cherry-600')}
            onClick={async () => {
              await signOut();
              navigate('/');
            }}
          >
            Log out
          </button>
        </>
      ) : (
        <Link to="/login" className={item}>Log in or sign up</Link>
      )}
    </div>
  );
}
