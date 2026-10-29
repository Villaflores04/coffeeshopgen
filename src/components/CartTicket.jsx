import { Link } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';
import { useCart } from '../lib/CartContext.jsx';
import { peso, pesoShort } from '../lib/format.js';
import { Ticket, TicketLine, TicketRule } from './Ticket.jsx';
import { btn } from './ui.jsx';

export function QtyStepper({ value, onChange, max }) {
  return (
    <span className="inline-flex items-center rounded-md border border-ink-900/25 font-sans">
      <button type="button" aria-label="Remove one" onClick={() => onChange(value - 1)} className="grid size-7 place-items-center hover:bg-ink-900/6">
        <Minus className="size-3.5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold tabular-nums">{value}</span>
      <button
        type="button"
        aria-label="Add one"
        disabled={max != null && value >= max}
        onClick={() => onChange(value + 1)}
        className="grid size-7 place-items-center hover:bg-ink-900/6 disabled:opacity-30"
      >
        <Plus className="size-3.5" />
      </button>
    </span>
  );
}

/** The live cart, drawn as a ticket. Used beside the menu on desktop. */
export default function CartTicket({ className }) {
  const { shop, items, subtotal, setQty } = useCart();

  return (
    <Ticket className={className}>
      <p className="font-medium">{shop ? shop.name : 'Your order'}</p>
      <TicketRule />

      {items.length === 0 ? (
        <p className="py-6 text-center text-ink-600">Nothing on the ticket yet.</p>
      ) : (
        <>
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key}>
                <TicketLine
                  left={
                    <>
                      {i.name}
                      {i.size && <span className="text-ink-600"> ({i.size})</span>}
                    </>
                  }
                  right={pesoShort(i.unitPrice * i.qty)}
                />
                <div className="mt-1.5">
                  <QtyStepper value={i.qty} max={i.max} onChange={(q) => setQty(i.key, q)} />
                </div>
              </li>
            ))}
          </ul>
          <TicketRule />
          <TicketLine left="Subtotal" right={peso(subtotal)} strong />
          <p className="mt-1 text-ink-600">
            {shop?.delivery_fee > 0 ? `Delivery ${pesoShort(shop.delivery_fee)} added at checkout` : 'Free delivery'}
          </p>
          <Link to="/cart" className={btn('primary', 'md', 'mt-4 w-full font-sans')}>
            Checkout
          </Link>
        </>
      )}
    </Ticket>
  );
}
