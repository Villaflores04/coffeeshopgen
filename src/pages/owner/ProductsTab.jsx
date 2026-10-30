import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { callAi } from '../../lib/ai.js';
import { supabase } from '../../lib/supabase.js';
import { useConfirm } from '../../lib/ConfirmContext.jsx';
import { useToast } from '../../lib/ToastContext.jsx';
import { errMsg, pesoShort } from '../../lib/format.js';
import ImageUpload from '../../components/ImageUpload.jsx';
import { Badge, Button, EmptyState, Field, Input, Modal, Skeleton, Textarea, Thumb, Toggle } from '../../components/ui.jsx';

const blank = { name: '', category: '', price: '', stock: '20', description: '', image_url: '', is_active: true, sizes: [] };
const CATEGORY_PRESETS = ['Coffee', 'Espresso', 'Iced Coffee', 'Milk Tea', 'Frappe', 'Non-Coffee', 'Tea', 'Pastries', 'Snacks', 'Other'];
const SIZE_PRESETS = ['Small', 'Medium', 'Large', 'Extra Large'];

function ProductForm({ shopId, product, categories, onSaved, onClose }) {
  const toast = useToast();
  const [f, setF] = useState(() =>
    product
      ? { ...blank, ...product, price: String(product.price), stock: String(product.stock), category: product.category ?? '', description: product.description ?? '', image_url: product.image_url ?? '' }
      : blank
  );
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const setSize = (i, patch) => setF({ ...f, sizes: f.sizes.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  // Fills only the fields the owner hasn't touched, so nothing they typed is overwritten.
  async function suggest() {
    setSuggesting(true);
    try {
      const out = await callAi({ mode: 'describe', name: f.name, categories });
      setF((cur) => ({
        ...cur,
        description: cur.description.trim() ? cur.description : out.description,
        category: cur.category.trim() ? cur.category : out.category,
        sizes: cur.sizes.length ? cur.sizes : out.sizes,
      }));
      toast.success('Suggestions added. Check them before saving.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSuggesting(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const sizes = f.sizes.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), extra: Math.max(0, Number(s.extra) || 0) }));
    const row = {
      shop_id: shopId,
      name: f.name.trim(),
      category: f.category.trim() || null,
      price: Math.max(0, Number(f.price) || 0),
      stock: Math.max(0, Math.floor(Number(f.stock) || 0)),
      description: f.description.trim() || null,
      image_url: f.image_url || null,
      is_active: f.is_active,
      sizes,
    };
    const { error } = product
      ? await supabase.from('products').update(row).eq('id', product.id)
      : await supabase.from('products').insert(row);
    setBusy(false);
    if (error) return toast.error(errMsg(error));
    toast.success(product ? 'Changes saved.' : 'Product added.');
    onSaved();
  }

  return (
    <Modal open onClose={onClose} title={product ? 'Edit product' : 'Add a product'} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <div className="flex gap-2">
              <Input value={f.name} onChange={set('name')} required autoFocus />
              <Button type="button" variant="outline" loading={suggesting} disabled={f.name.trim().length < 2} onClick={suggest} title="Fills in the description, category and sizes for you">
                <Sparkles className="size-4" aria-hidden /> AI fill
              </Button>
            </div>
          </Field>
          <Field label="Category" hint="Groups your menu, like Espresso or Pastry.">
            <Input list="categories" value={f.category} onChange={set('category')} />
            <datalist id="categories">{[...new Set([...CATEGORY_PRESETS, ...categories])].map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Base price (₱)"><Input type="number" min="0" step="0.01" inputMode="decimal" value={f.price} onChange={set('price')} required /></Field>
          <Field label="In stock"><Input type="number" min="0" step="1" inputMode="numeric" value={f.stock} onChange={set('stock')} required /></Field>
          <Field label="Description" className="sm:col-span-2"><Textarea rows={2} value={f.description} onChange={set('description')} /></Field>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-800">Sizes</p>
          <p className="mb-2 text-[13px] text-ink-600">Leave empty if there’s one size. The extra amount is added to the base price. Choose a preset or enter your own size.</p>
          <div className="mb-3 flex flex-wrap gap-2">{SIZE_PRESETS.map((name) => <Button key={name} type="button" variant="outline" size="sm" disabled={f.sizes.some((s) => s.name.toLowerCase() === name.toLowerCase())} onClick={() => setF({ ...f, sizes: [...f.sizes, { name, extra: 0 }] })}>{name}</Button>)}</div>
          <div className="space-y-2">
            {f.sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input aria-label="Size name" placeholder="Large" value={s.name} onChange={(e) => setSize(i, { name: e.target.value })} />
                <Input aria-label="Extra price" type="number" min="0" step="1" placeholder="Extra ₱" className="w-28" value={s.extra} onChange={(e) => setSize(i, { extra: e.target.value })} />
                <button type="button" aria-label="Remove size" onClick={() => setF({ ...f, sizes: f.sizes.filter((_, idx) => idx !== i) })} className="grid size-10 shrink-0 place-items-center rounded-lg hover:bg-ink-900/6">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setF({ ...f, sizes: [...f.sizes, { name: '', extra: 0 }] })}>
            <Plus className="size-4" /> Add a size
          </Button>
        </div>

        <ImageUpload label="Photo" shape="square" value={f.image_url} onChange={(v) => setF({ ...f, image_url: v })} />

        <label className="flex items-center gap-3 text-sm font-medium">
          <Toggle checked={f.is_active} onChange={(v) => setF({ ...f, is_active: v })} label="Show on menu" />
          Show on the menu
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="dark" loading={busy}>{product ? 'Save product changes' : 'Save product'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProductsTab({ shopId }) {
  const confirm = useConfirm();
  const toast = useToast();
  const [products, setProducts] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | product

  const load = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').eq('shop_id', shopId).order('category').order('name');
    setProducts(data ?? []);
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(p, value) {
    const { error } = await supabase.from('products').update({ is_active: value }).eq('id', p.id);
    if (error) return toast.error(errMsg(error));
    load();
  }

  async function remove(p) {
    const ok = await confirm({ title: `Delete ${p.name}?`, message: 'It disappears from your menu. Past orders keep their records.', confirmText: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('products').delete().eq('id', p.id);
    if (error) return toast.error(errMsg(error));
    load();
  }

  if (!products) return <Skeleton className="h-48 w-full" />;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="dark" onClick={() => setEditing('new')}><Plus className="size-4" /> Add product</Button>
      </div>

      {products.length === 0 ? (
        <EmptyState title="Your menu is empty" action={<Button variant="primary" onClick={() => setEditing('new')}>Add your first product</Button>}>
          Customers can’t order until there’s something on the menu.
        </EmptyState>
      ) : (
        <ul className="mt-4 divide-y divide-ink-900/10 border-y border-ink-900/10">
          {products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 py-4">
              <Thumb src={p.image_url} className="size-14 rounded-lg" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg font-bold">{p.name}</p>
                <p className="text-sm text-ink-600">
                  {pesoShort(p.price)}{p.sizes?.length > 0 && `, ${p.sizes.map((s) => s.name).join(' / ')}`}{p.category && `, ${p.category}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {p.stock === 0 ? <Badge tone="danger">Sold out</Badge> : p.stock <= 5 ? <Badge tone="warn">{p.stock} left</Badge> : <span className="text-sm text-ink-600">{p.stock} in stock</span>}
              </div>
              <div className="flex items-center gap-1">
                <Toggle checked={p.is_active} onChange={(v) => toggle(p, v)} label={`Show ${p.name} on menu`} />
                <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="ml-2 grid size-9 place-items-center rounded-lg hover:bg-ink-900/6"><Pencil className="size-4" /></button>
                <button onClick={() => remove(p)} aria-label={`Delete ${p.name}`} className="grid size-9 place-items-center rounded-lg text-cherry-600 hover:bg-cherry-100"><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <ProductForm
          shopId={shopId}
          product={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
