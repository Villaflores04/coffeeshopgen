import { Logo } from './Navbar.jsx';

/** Shown instead of a blank page when the Supabase env vars are missing. */
export default function SetupNotice() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <Logo className="mb-8" />
      <h1 className="font-display text-4xl font-extrabold tracking-tight">Connect your Supabase project</h1>
      <p className="mt-3 text-ink-700">The app can’t find your Supabase keys. Add these two variables, then restart the dev server.</p>
      <pre className="mt-6 overflow-x-auto rounded-xl bg-ink-900 p-5 font-mono text-sm leading-relaxed text-foam">
{`VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}
      </pre>
      <p className="mt-5 text-sm text-ink-600">
        Locally, put them in <code className="rounded bg-ink-900/8 px-1.5 py-0.5 font-mono">.env.local</code>. On Vercel, add them under
        Settings, Environment Variables, then redeploy. You’ll find both values in Supabase under Project Settings, API.
      </p>
    </div>
  );
}
