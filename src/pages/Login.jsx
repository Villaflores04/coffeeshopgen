import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { btnCls, cardCls, inputCls } from '../lib/ui.js';

export default function Login() {
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ email: '', password: '', fullName: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/';

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    const res =
      mode === 'signin'
        ? await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
        : await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: { data: { full_name: form.fullName } },
          });

    setBusy(false);

    if (res.error) return setError(res.error.message);
    if (mode === 'signup' && !res.data.session) {
      return setMessage('Check your email to confirm your account, then log in.');
    }
    navigate(from, { replace: true });
  }

  return (
    <div className={`mx-auto max-w-md ${cardCls}`}>
      <h1 className="text-2xl font-bold text-stone-900">
        {mode === 'signin' ? 'Welcome back' : 'Create your account'}
      </h1>

      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === 'signup' && (
          <input className={inputCls} placeholder="Full name" value={form.fullName}
                 onChange={update('fullName')} required />
        )}
        <input className={inputCls} type="email" placeholder="Email" value={form.email}
               onChange={update('email')} required />
        <input className={inputCls} type="password" placeholder="Password (min. 6 characters)"
               value={form.password} onChange={update('password')} minLength={6} required />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700">{message}</p>}

        <button className={`${btnCls} w-full`} disabled={busy}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          className="font-semibold text-amber-700 hover:underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Sign up' : 'Log in'}
        </button>
      </p>
    </div>
  );
}
