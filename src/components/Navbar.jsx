import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import { useCart } from '../lib/CartContext.jsx';

export default function Navbar() {
  const { session, profile, signOut } = useAuth();
  const { count } = useCart();

  const linkCls = ({ isActive }) =>
    `hover:text-amber-700 ${isActive ? 'font-semibold text-amber-700' : 'text-stone-600'}`;

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-xl font-bold text-amber-800">
          ☕ CoffeeShop Gen
        </Link>

        <div className="flex items-center gap-5 text-sm">
          <NavLink to="/" end className={linkCls}>Shops</NavLink>
          {session && <NavLink to="/orders" className={linkCls}>My Orders</NavLink>}
          {session && <NavLink to="/owner" className={linkCls}>My Shop</NavLink>}
          {profile?.role === 'admin' && <NavLink to="/admin" className={linkCls}>Admin</NavLink>}
          <NavLink to="/cart" className={linkCls}>Cart ({count})</NavLink>

          {session ? (
            <button
              onClick={signOut}
              className="rounded-lg bg-stone-800 px-3 py-1.5 text-white hover:bg-stone-700"
            >
              Log out
            </button>
          ) : (
            <NavLink to="/login" className={linkCls}>Log in</NavLink>
          )}
        </div>
      </nav>
    </header>
  );
}
