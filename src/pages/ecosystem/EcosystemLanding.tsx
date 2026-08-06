import { Link } from 'react-router-dom';

const HUBS = [
  {
    to: '/ecosystem/builder',
    label: 'Builder',
    audience: 'Homeowners · B2C',
    description: 'Roadmap, budget dial, wallet-to-wall feasibility, milestone escrow, find-a-pro, delivery tracking, red-pen audit, group buying and must-haves.',
    accent: 'bg-brand/10 text-brand-accent border-brand/20',
  },
  {
    to: '/ecosystem/contractor',
    label: 'Contractor',
    audience: 'Builders · B2B',
    description: 'Portfolio, P&L vs actual, P4P certificates, SADC price index, procurement TCO, logistics, WIPAA revenue recognition, resource hubs and pending items.',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    to: '/ecosystem/bulk',
    label: 'Bulk Procurement',
    audience: 'Dispatch · B2B',
    description: 'Uber-style JIT dispatch straight from the bill of quantities — nearest-supplier matching, GPS-verified deliveries and escrow-gated payments.',
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];

const WORKFLOW = [
  { step: 'RFQ', owner: 'Contractor', icon: '📋', hint: 'Issue a request for pricing on a project' },
  { step: 'Quote', owner: 'Supplier', icon: '💬', hint: 'Price it with delivery days' },
  { step: 'Award', owner: 'Contractor', icon: '🏆', hint: 'Best TCO wins the PO' },
  { step: 'Escrow', owner: 'Contractor', icon: '🔒', hint: 'Funds ring-fenced per milestone' },
  { step: 'Delivery', owner: 'Supplier', icon: '🚚', hint: 'Geo-fenced drop confirmed' },
  { step: 'Settle', owner: 'Both', icon: '✅', hint: 'Escrow releases · credit notes for defects' },
];

export default function EcosystemLanding() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-wide text-brand-accent">Ecosystem</p>
      <h1 className="mt-1 text-3xl font-bold text-slate-800">One build market, three seats</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-400">
        The whole build lifecycle — design, money, materials and trade — brought together in one marketplace.
        Pick the seat that matches how you work.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {HUBS.map((hub) => (
          <Link key={hub.to} to={hub.to}
            className={`group rounded-xl border p-5 shadow-sm transition-transform hover:-translate-y-0.5 ${hub.accent}`}>
            <div className="text-xs font-semibold uppercase tracking-wide">{hub.audience}</div>
            <h2 className="mt-1 text-2xl font-bold text-slate-800">{hub.label}</h2>
            <p className="mt-2 text-sm text-slate-400">{hub.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 group-hover:gap-2">
              Open dashboard <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">How a deal flows</h2>
        <p className="mt-1 text-sm text-slate-400">
          One escrowed pipeline across both seats — RFQ through settlement, with funds held in trust until delivery is accepted.
        </p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {WORKFLOW.map((w, i) => (
            <li key={w.step} className="relative rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3">
              <div className="flex items-center justify-between">
                <span aria-hidden className="text-lg">{w.icon}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand-accent">{i + 1}</span>
              </div>
              <div className="mt-1.5 text-sm font-semibold text-slate-700">{w.step}</div>
              <div className="text-[11px] font-medium text-brand-accent">{w.owner}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{w.hint}</div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
