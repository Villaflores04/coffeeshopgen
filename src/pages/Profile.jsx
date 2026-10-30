import { useState } from 'react';
import { useAuth } from '../lib/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';
import { useToast } from '../lib/ToastContext.jsx';
import { errMsg } from '../lib/format.js';
import { Button, Field, Input, PageHeading, Panel } from '../components/ui.jsx';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.default_address ?? '');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="mx-auto max-w-2xl pt-8 sm:pt-12">
      <PageHeading title="My profile">Keep your contact details up to date for a smoother checkout.</PageHeading>
      <Panel className="p-5 sm:p-7">
        <div className="mb-6 border-b border-ink-900/10 pb-5">
          <p className="text-sm text-ink-600">Signed in as</p>
          <p className="mt-1 break-all font-semibold">{user.email}</p>
          <p className="mt-2 text-xs text-ink-600">Account type: <span className="font-semibold capitalize">{profile?.role ?? 'customer'}</span></p>
        </div>
        <form onSubmit={save} className="space-y-4">
          <Field label="Full name"><Input value={fullName} onChange={e => setFullName(e.target.value)} required maxLength={100} /></Field>
          <Field label="Phone number"><Input type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={30} placeholder="Your contact number" /></Field>
          <Field label="Default delivery address"><Input value={address} onChange={e => setAddress(e.target.value)} maxLength={300} placeholder="House number, street, barangay, city" /></Field>
          <div className="flex justify-end pt-2"><Button variant="dark" loading={busy}>Save profile</Button></div>
        </form>
      </Panel>
    </div>
  );
}
