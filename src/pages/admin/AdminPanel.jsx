import { useCallback, useEffect, useState } from 'react';
import { Search, ClipboardList, Activity, ShieldAlert, RefreshCw, Pencil, Check, X } from 'lucide-react';
import { supabase } from '../../lib/supabase.js';
import { useToast } from '../../lib/ToastContext.jsx';
import { dateTime, errMsg, peso } from '../../lib/format.js';
import { Badge, Button, EmptyState, Input, PageHeading, Panel, Skeleton, Thumb } from '../../components/ui.jsx';

const sections = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'approvals', label: 'Approvals', icon: ClipboardList },
  { id: 'accounts', label: 'Accounts', icon: ShieldAlert },
];

const statusTone = (status) => ({
  approved: 'success', pending: 'warn', rejected: 'danger', suspended: 'danger',
  delivered: 'success', cancelled: 'danger',
}[status] || 'neutral');

function Stat({ label, value, note }) {
  return <Panel className="min-w-0 p-4 sm:p-5">
    <p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</p>
    <p className="mt-2 break-words font-display text-2xl font-extrabold tabular-nums sm:text-3xl">{value ?? '—'}</p>
    {note && <p className="mt-1 text-xs text-ink-600">{note}</p>}
  </Panel>;
}

function SectionTitle({ title, detail, count }) {
  return <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
    <div><h2 className="font-display text-2xl font-bold">{title}</h2>
      {detail && <p className="mt-1 text-sm text-ink-600">{detail}</p>}</div>
    {count !== undefined && <Badge>{count} records</Badge>}
  </div>;
}

export default function AdminPanel() {
  const toast = useToast();
  const [section, setSection] = useState('overview');
  const [shops, setShops] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState('');
  const [editingProfile, setEditingProfile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [s, p, st] = await Promise.all([
      supabase.from('shops').select('*, owner:profiles(id,full_name,phone,role,is_suspended,suspension_reason)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,phone,role,is_suspended,suspension_reason,suspended_at,created_at').order('created_at', { ascending: false }),
      supabase.rpc('admin_stats'),
    ]);
    const failed = [s, p, st].find((r) => r.error);
    if (failed) setError(errMsg(failed.error));
    setShops(s.data ?? []); setProfiles(p.data ?? []);
    setStats(st.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = (items, fields) => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => fields.some((field) => String(field(item) ?? '').toLowerCase().includes(q)));
  };
  const pending = shops.filter((s) => s.status === 'pending');
  const visibleShops = filtered(section === 'approvals' ? pending : shops, [
    (s) => s.name, (s) => s.owner?.full_name, (s) => s.address, (s) => s.contact_email,
  ]);
  const visibleProfiles = filtered(profiles, [
    (p) => p.full_name, (p) => p.phone, (p) => p.role, (p) => p.is_suspended ? 'suspended' : 'active',
  ]);

  async function shopAction(shop, action) {
    let reason = null;
    if (['reject', 'suspend'].includes(action)) {
      reason = window.prompt(action === 'reject' ? 'Why is this application being rejected?' : 'Why is this shop being suspended?');
      if (!reason?.trim()) return;
    } else if (!window.confirm(action === 'approve' ? 'Approve this shop and allow it to sell?' : 'Restore this shop and allow it to sell again?')) return;
    setBusy(shop.id);
    const { error: err } = await supabase.rpc('admin_manage_shop', {
      p_shop: shop.id, p_action: action, p_reason: reason, p_changes: {},
    });
    setBusy('');
    if (err) return toast.error(errMsg(err));
    toast.success(action === 'approve' ? 'Shop approved and activated.' : action === 'reject' ? 'Application rejected.' : action === 'suspend' ? 'Shop suspended.' : 'Shop restored.');
    await load();
  }

  async function accountAction(profile, suspend) {
    const reason = suspend ? window.prompt('Enter the reason for suspending this account:') : null;
    if (suspend && !reason?.trim()) return;
    if (!suspend && !window.confirm('Restore this account’s access?')) return;
    setBusy(profile.id);
    const { error: err } = await supabase.rpc('admin_set_account_suspension', {
      p_user: profile.id, p_suspend: suspend, p_reason: reason,
    });
    setBusy('');
    if (err) return toast.error(errMsg(err));
    toast.success(suspend ? 'Account suspended.' : 'Account restored.'); load();
  }

  async function saveProfile(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(editingProfile.id);
    const { error: err } = await supabase.rpc('admin_update_profile', {
      p_user: editingProfile.id, p_full_name: form.get('full_name'), p_phone: form.get('phone'),
    });
    setBusy('');
    if (err) return toast.error(errMsg(err));
    setEditingProfile(null); toast.success('Account details updated.'); load();
  }

  const nav = <nav aria-label="Admin sections" className="-mx-4 mb-7 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
    {sections.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setSection(id); setQuery(''); }}
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${section === id ? 'bg-ink-900 text-white' : 'bg-ink-900/5 text-ink-700 hover:bg-ink-900/10'}`}>
      <Icon className="size-4" />{label}
      {id === 'approvals' && pending.length > 0 && <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{pending.length}</span>}
    </button>)}
  </nav>;

  const search = <div className="mb-5 flex flex-col gap-3 sm:flex-row">
    <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-ink-500" />
      <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this section…" /></div>
    <Button variant="outline" onClick={load} disabled={loading}><RefreshCw className="size-4" /> Refresh</Button>
  </div>;

  const shopCard = (s, approval = false) => <Panel key={s.id} className="p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 gap-3">
        <Thumb src={s.logo_url} className="size-12 rounded-lg" />
        <div className="min-w-0"><h3 className="break-words font-display text-xl font-bold">{s.name}</h3>
          <p className="text-sm text-ink-600">{s.owner?.full_name || 'Owner profile unavailable'} · {dateTime(s.created_at)}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Badge tone={statusTone(s.status)}>{s.status}</Badge>
            {s.owner?.is_suspended && <Badge tone="danger">Owner account suspended</Badge>}</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {approval && <Button size="sm" variant="primary" loading={busy === s.id} onClick={() => shopAction(s, 'approve')}><Check className="size-4" /> Approve</Button>}
        {s.status === 'pending' && <Button size="sm" variant="danger" loading={busy === s.id} onClick={() => shopAction(s, 'reject')}>Reject</Button>}
        {s.status === 'rejected' && <Button size="sm" variant="primary" loading={busy === s.id} onClick={() => shopAction(s, 'approve')}>Re-approve</Button>}
        {s.status === 'approved' && <Button size="sm" variant="danger" loading={busy === s.id} onClick={() => shopAction(s, 'suspend')}>Suspend</Button>}
        {s.status === 'suspended' && <Button size="sm" variant="primary" loading={busy === s.id} onClick={() => shopAction(s, 'restore')}>Restore</Button>}
      </div>
    </div>
    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt className="text-ink-500">Address</dt><dd>{s.address || 'Not provided'}</dd></div>
      <div><dt className="text-ink-500">Contact</dt><dd>{s.contact_phone || 'No phone'} · {s.contact_email || 'No email'}</dd></div>
      <div><dt className="text-ink-500">Business hours</dt><dd>{s.business_hours || 'Not provided'}</dd></div>
      <div><dt className="text-ink-500">Delivery</dt><dd>{peso(s.delivery_fee)} fee · {peso(s.min_order)} minimum</dd></div>
    </dl>
    {s.rejection_reason && <p className="mt-3 rounded-lg bg-ink-900/5 p-3 text-sm"><strong>Admin note:</strong> {s.rejection_reason}</p>}
  </Panel>;

  if (loading && !shops.length) return <div className="pt-8"><PageHeading title="Admin control center">Manage shop applications and user account access.</PageHeading><Skeleton className="h-12 w-full" /><Skeleton className="mt-5 h-48 w-full" /></div>;

  return <div className="pt-8 pb-12 sm:pt-12">
    <PageHeading title="Admin control center" actions={<Badge tone="success">Admin access</Badge>}>
      Review shop applications and manage customer and shop-owner accounts.
    </PageHeading>
    {error && <Panel className="mb-5 border-cherry-500/30 bg-cherry-100 p-4 text-sm text-cherry-700">{error}<button className="ml-2 underline" onClick={load}>Try again</button></Panel>}
    {nav}

    {section === 'overview' && <>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Approved shops" value={stats?.approved_shops} note="Active marketplace shops" />
        <Stat label="Pending applications" value={pending.length} note="Awaiting your review" />
        <Stat label="User accounts" value={profiles.length} note="Customers and shop owners" />
        <Stat label="Suspended accounts" value={stats?.suspended_accounts} note="Access currently paused" />
      </div>
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-display text-xl font-bold">Pending shop applications</h2><p className="mt-1 text-sm text-ink-600">Review new shop requests before they become available to customers.</p></div>
          <Button onClick={() => setSection('approvals')}><ClipboardList className="size-4" /> Review applications</Button>
        </div>
        {pending.length ? <div className="mt-4 divide-y divide-ink-900/10 border-t border-ink-900/10">
          {pending.slice(0,4).map((s) => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{s.name}</p><p className="text-sm text-ink-600">{s.owner?.full_name || 'Unknown owner'} · {dateTime(s.created_at)}</p></div><Button size="sm" variant="outline" onClick={() => setSection('approvals')}>Review</Button></div>)}
        </div> : <p className="mt-4 border-t border-ink-900/10 pt-4 text-sm text-ink-600">There are no applications waiting for review.</p>}
      </Panel>
    </>}

    {section === 'approvals' && <><SectionTitle title="Shop applications" detail="Only approved shops can publish products and accept orders." count={pending.length} />{search}
      <div className="space-y-4">{visibleShops.map((s) => shopCard(s, true))}</div>
      {!visibleShops.length && <EmptyState title="No matching applications">Pending applications will appear here.</EmptyState>}
    </>}

    {section === 'accounts' && <><SectionTitle title="User accounts" detail="Inspect account details, update profile information, and suspend or restore access." count={visibleProfiles.length} />{search}
      <div className="space-y-3">{visibleProfiles.map((p) => <Panel key={p.id} className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-words font-semibold">{p.full_name || 'Unnamed account'}</h3><p className="text-sm text-ink-600">{p.phone || 'No phone'} · Joined {dateTime(p.created_at)}</p><div className="mt-2 flex flex-wrap gap-2"><Badge>{p.role}</Badge><Badge tone={p.is_suspended ? 'danger' : 'success'}>{p.is_suspended ? 'Suspended' : 'Active'}</Badge></div>{p.suspension_reason && <p className="mt-2 text-sm text-cherry-600">Reason: {p.suspension_reason}</p>}</div>
          {p.role !== 'admin' && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditingProfile(p)}><Pencil className="size-3.5" /> Edit</Button>
            {p.is_suspended ? <Button size="sm" variant="primary" loading={busy===p.id} onClick={() => accountAction(p,false)}>Restore</Button> : <Button size="sm" variant="danger" loading={busy===p.id} onClick={() => accountAction(p,true)}>Suspend</Button>}</div>}
        </div>
        {p.role === 'owner' && <p className="mt-3 text-xs text-ink-600">{shops.filter((s)=>s.owner_id===p.id).map((s)=>s.name).join(', ') || 'No shop application linked'}</p>}
      </Panel>)}</div>
      {!visibleProfiles.length && <EmptyState title="No accounts found">Try another search term.</EmptyState>}
    </>}

    {editingProfile && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-5" onMouseDown={()=>setEditingProfile(null)}>
      <form onSubmit={saveProfile} onMouseDown={(e)=>e.stopPropagation()} className="w-full max-w-md space-y-4 rounded-t-2xl bg-white p-5 sm:rounded-2xl sm:p-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl font-bold">Edit account</h2><button type="button" onClick={()=>setEditingProfile(null)} aria-label="Close"><X /></button></div>
        <label className="block text-sm font-medium">Full name<Input name="full_name" defaultValue={editingProfile.full_name || ''} /></label>
        <label className="block text-sm font-medium">Phone<Input name="phone" defaultValue={editingProfile.phone || ''} /></label>
        <p className="text-xs text-ink-500">Role changes and permanent account deletion are intentionally restricted to protect order history and admin access.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setEditingProfile(null)}>Cancel</Button><Button type="submit" loading={busy===editingProfile.id}>Save</Button></div>
      </form>
    </div>}
  </div>;
}
