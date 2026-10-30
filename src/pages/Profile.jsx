import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Gift, Store } from 'lucide-react';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { useToast } from '../lib/ToastContext.jsx';
import { errMsg, initials } from '../lib/format.js';
import { Badge, Button, Field, Input, Panel } from '../components/ui.jsx';

const ROLE_LABEL = { customer: 'Customer', owner: 'Shop owner', admin: 'Administrator' };

export default function Profile() {
  const { user, profile, role, refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.default_address ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.default_address ?? '');
  }, [profile]);

  const dirty = fullName.trim() !== (profile?.full_name ?? '') || phone.trim() !== (profile?.phone ?? '') || address.trim() !== (profile?.default_address ?? '');

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, default_address: address.trim() || null })
      .eq('id', user.id);
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    await refreshProfile();
    toast.success('Profile updated.');
  }

  const links = role === 'admin'
    ? [{ to: '/admin', icon: Store, label: 'Admin control center' }]
    : [
        { to: '/orders', icon: ClipboardList, label: 'My orders' },
        { to: '/rewards', icon: Gift, label: 'Rewards' },
        { to: '/owner', icon: Store, label: role === 'owner' ? 'My shop' : 'Open a shop' },
      ];

  return (
    <div className="pt-8 pb-4 sm:pt-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">My profile</h1>
      <p className="mt-2 text-ink-600">Your name and contact details are used at checkout and shown to shops you order from.</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[18rem_1fr]">
        <Panel className="p-6 text-center lg:sticky lg:top-24">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-ink-900 font-display text-3xl font-extrabold text-foam" aria-hidden>
            {initials(profile?.full_name || user.email)}
          </div>
          <p className="mt-4 truncate font-display text-xl font-bold">{profile?.full_name || 'Your name'}</p>
          <p className="mt-0.5 truncate text-sm text-ink-600">{user.email}</p>
          <Badge tone={role === 'customer' ? 'neutral' : 'dark'} className="mt-3">{ROLE_LABEL[role] ?? role}</Badge>
          <nav className="mt-6 space-y-1 border-t border-ink-900/10 pt-4 text-left" aria-label="Account shortcuts">
            {links.map(({ to, icon: Icon, label }) => (
              <Link key={to} to={to} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold hover:bg-ink-900/6">
                <Icon className="size-4 text-ink-600" aria-hidden /> {label}
              </Link>
            ))}
          </nav>
        </Panel>

        <Panel className="p-5 sm:p-7">
          <h2 className="font-display text-2xl font-bold">Personal details</h2>
          <form onSubmit={save} className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={100} autoComplete="name" /></Field>
            <Field label="Email" hint="Your sign-in email can’t be changed here."><Input value={user.email} readOnly disabled /></Field>
            <Field label="Phone number"><Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="09XX XXX XXXX" autoComplete="tel" /></Field>
            <Field label="Default delivery address" hint="Filled in for you at checkout." className="sm:col-span-2">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} placeholder="House no., street, barangay, city" autoComplete="street-address" />
            </Field>
            <div className="flex items-center justify-end gap-3 border-t border-ink-900/10 pt-5 sm:col-span-2">
              {dirty && <span className="text-sm text-ink-600">Unsaved changes</span>}
              <Button variant="dark" loading={busy} disabled={!dirty}>Save changes</Button>
            </div>
          </form>
        </Panel>
      </div>
    </div>
  );
}
