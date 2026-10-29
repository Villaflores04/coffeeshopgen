import { useState } from 'react';
import ImageUpload from '../../components/ImageUpload.jsx';
import { Button, Field, Input, Textarea } from '../../components/ui.jsx';

const blank = {
  name: '', tagline: '', description: '', logo_url: '', cover_url: '', address: '',
  contact_phone: '', contact_email: '', business_hours: '', delivery_info: '',
  delivery_fee: '0', min_order: '0', instagram: '', facebook: '',
};

function fromShop(shop) {
  if (!shop) return blank;
  const social = shop.social_links ?? {};
  return {
    ...blank,
    ...Object.fromEntries(Object.keys(blank).map((k) => [k, shop[k] ?? blank[k]])),
    delivery_fee: String(shop.delivery_fee ?? 0),
    min_order: String(shop.min_order ?? 0),
    instagram: social.instagram ?? '',
    facebook: social.facebook ?? '',
  };
}

/** Used for both the first application and later edits in Settings. */
export default function ShopForm({ shop, submitLabel, onSubmit, busy, error }) {
  const [f, setF] = useState(() => fromShop(shop));
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const nn = (v) => (v.trim() === '' ? null : v.trim());

  function submit(e) {
    e.preventDefault();
    onSubmit({
      name: f.name.trim(),
      tagline: nn(f.tagline),
      description: nn(f.description),
      logo_url: nn(f.logo_url),
      cover_url: nn(f.cover_url),
      address: nn(f.address),
      contact_phone: nn(f.contact_phone),
      contact_email: nn(f.contact_email),
      business_hours: nn(f.business_hours),
      delivery_info: nn(f.delivery_info),
      delivery_fee: Math.max(0, Number(f.delivery_fee) || 0),
      min_order: Math.max(0, Number(f.min_order) || 0),
      social_links: { instagram: f.instagram.trim(), facebook: f.facebook.trim() },
    });
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <section className="space-y-4">
        <h3 className="font-display text-xl font-bold">About the shop</h3>
        <Field label="Shop name">
          <Input value={f.name} onChange={set('name')} minLength={2} maxLength={80} required />
        </Field>
        <Field label="Tagline" hint="One line under your name, like “Pour-overs and a very good flat white”.">
          <Input value={f.tagline} onChange={set('tagline')} maxLength={120} />
        </Field>
        <Field label="Description">
          <Textarea rows={4} value={f.description} onChange={set('description')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <ImageUpload label="Logo" shape="square" value={f.logo_url} onChange={(v) => setF({ ...f, logo_url: v })} />
          <ImageUpload label="Cover photo" value={f.cover_url} onChange={(v) => setF({ ...f, cover_url: v })} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-xl font-bold">Contact and hours</h3>
        <Field label="Address">
          <Input value={f.address} onChange={set('address')} autoComplete="street-address" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone"><Input type="tel" value={f.contact_phone} onChange={set('contact_phone')} required /></Field>
          <Field label="Email"><Input type="email" value={f.contact_email} onChange={set('contact_email')} /></Field>
          <Field label="Business hours" className="sm:col-span-2" hint="For example: Daily, 7:00 AM to 8:00 PM">
            <Input value={f.business_hours} onChange={set('business_hours')} required />
          </Field>
          <Field label="Instagram"><Input value={f.instagram} onChange={set('instagram')} placeholder="@yourshop" /></Field>
          <Field label="Facebook"><Input value={f.facebook} onChange={set('facebook')} placeholder="facebook.com/yourshop" /></Field>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="font-display text-xl font-bold">Delivery</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Delivery fee (₱)" hint="Charged to the customer. Enter 0 for free delivery.">
            <Input type="number" min="0" step="1" inputMode="decimal" value={f.delivery_fee} onChange={set('delivery_fee')} />
          </Field>
          <Field label="Minimum order (₱)">
            <Input type="number" min="0" step="1" inputMode="decimal" value={f.min_order} onChange={set('min_order')} />
          </Field>
          <Field label="Delivery details" className="sm:col-span-2" hint="Areas you deliver to, how long it usually takes.">
            <Input value={f.delivery_info} onChange={set('delivery_info')} />
          </Field>
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-cherry-600">{error}</p>}
      <Button variant="dark" size="lg" loading={busy}>{submitLabel}</Button>
    </form>
  );
}
