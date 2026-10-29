import { useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/AuthContext.jsx';
import { Button, Field, Input } from '../components/ui.jsx';
import { errMsg } from '../lib/format.js';

export default function Login() {
  const [params] = useSearchParams();
  const ref = (params.get('ref') || '').toUpperCase();
  const [mode, setMode] = useState(params.get('mode') === 'signup' || ref ? 'signup' : 'signin');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const from = useLocation().state?.from ?? '/';

  if (!loading && session) return <Navigate to={from} replace />;

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');

    const { data, error: err } =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
              data: { full_name: form.fullName.trim(), referral_code: ref || undefined },
              emailRedirectTo: window.location.origin,
            },
          });

    setBusy(false);
    if (err) return setError(errMsg(err));
    if (mode === 'signup' && !data.session) {
      return setNotice('We sent you a confirmation email. Open it, then come back and log in.');
    }
    navigate(from, { replace: true });
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-12 py-12 sm:py-20 md:grid-cols-2 md:items-center">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
          {mode === 'signin' ? 'Welcome back.' : 'Make an account to start ordering.'}
        </h1>
        <p className="mt-4 max-w-sm text-ink-700">
          {mode === 'signin'
            ? 'Log in to see your orders and your points.'
            : 'It takes a minute. You can use the same account to open a shop later.'}
        </p>
        {ref && mode === 'signup' && (
          <p className="mt-6 flex max-w-sm items-start gap-3 rounded-lg bg-kraft-200 px-4 py-3 text-sm">
            <Gift className="mt-0.5 size-4 shrink-0" aria-hidden />
            A friend invited you. You’ll both get bonus points after your first order of ₱200 or more.
          </p>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-ink-900/12 bg-foam p-6 sm:p-8">
        {mode === 'signup' && (
          <Field label="Full name">
            <Input value={form.fullName} onChange={set('fullName')} autoComplete="name" required />
          </Field>
        )}
        <Field label="Email">
          <Input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </Field>
        <Field label="Password" hint={mode === 'signup' ? 'At least 6 characters.' : undefined}>
          <Input type="password" value={form.password} onChange={set('password')} minLength={6} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required />
        </Field>

        {error && <p role="alert" className="text-sm text-cherry-600">{error}</p>}
        {notice && <p role="status" className="text-sm text-moss-600">{notice}</p>}

        <Button variant="primary" size="lg" className="w-full" loading={busy}>
          {mode === 'signin' ? 'Log in' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-ink-700">
          {mode === 'signin' ? 'New here? ' : 'Already have an account? '}
          <button type="button" className="font-semibold underline underline-offset-2" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setNotice(''); }}>
            {mode === 'signin' ? 'Create an account' : 'Log in'}
          </button>
        </p>
      </form>
    </div>
  );
}
