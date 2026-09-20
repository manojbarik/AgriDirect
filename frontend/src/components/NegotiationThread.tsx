import type { NegotiationMessage, StatusEvent } from '../api/orders'

const ACTION_STYLE: Record<string, string> = {
  REQUEST: 'bg-[#eef3f0] text-[#37474f]',
  COUNTER: 'bg-[#fff2df] text-[#9b501e]',
  ACCEPT: 'bg-[#e7f3ee] text-[#1b6f58]',
  REJECT: 'bg-[#fdecea] text-[#b3261e]',
}

export function NegotiationThread({
  messages,
  statusEvents,
}: {
  messages: NegotiationMessage[]
  statusEvents: StatusEvent[]
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[#d9e3d6] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">
          Negotiation history
        </p>
        <ul className="mt-3 space-y-3">
          {messages.length === 0 && (
            <li className="text-sm text-[#60736b]">No offers yet.</li>
          )}
          {messages.map((message) => (
            <li key={message.id} className="rounded-lg bg-[#f7faf7] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold">{message.from_role}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ACTION_STYLE[message.action] ?? 'bg-[#eef3f0] text-[#37474f]'}`}>
                  {message.action}
                </span>
                <span className="text-xs text-[#60736b]">
                  {new Date(message.created_at).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#37474f]">
                {message.quantity} {message.unit} · ₹{message.price}/{message.unit}
                {message.delivery_date ? ` · delivery ${message.delivery_date}` : ''}
              </p>
              {message.note && <p className="mt-1 text-sm italic text-[#60736b]">"{message.note}"</p>}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-[#d9e3d6] bg-white p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[#60736b]">Status history</p>
        <ul className="mt-3 space-y-2">
          {statusEvents.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-xs text-[#60736b]">{new Date(event.created_at).toLocaleString()}</span>
              <span className="rounded-full bg-[#eef3f0] px-2 py-0.5 text-[11px] font-bold text-[#37474f]">
                {event.from_status ?? '—'} → {event.to_status}
              </span>
              <span className="text-xs font-semibold text-[#60736b]">by {event.changed_by_role}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}