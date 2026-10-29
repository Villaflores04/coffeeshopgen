import { Link } from 'react-router-dom';
import { Logo } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-900/10 pb-24 lg:pb-0">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 sm:px-6">
        <Logo />
        <p className="text-sm text-ink-600">Independent coffee shops, one order at a time.</p>
        <div className="flex gap-5 text-sm font-semibold text-ink-700">
          <Link to="/" className="hover:text-ink-900">Shops</Link>
          <Link to="/owner" className="hover:text-ink-900">Open a shop</Link>
          <Link to="/rewards" className="hover:text-ink-900">Rewards</Link>
        </div>
      </div>
    </footer>
  );
}
