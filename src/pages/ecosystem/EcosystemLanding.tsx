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
    to: '/ecosystem/supplier',
    label: 'Supplier',
    audience: 'Suppliers · B2B',
    description: 'Sales pipeline, scorecards, TCO quoting, escrow-backed contracts, proof of funds, fleet geofence, demand radar, flash deals and dispute credit notes.',
    accent: 'bg-amber-50 text-amber-700 border-amber-200',
  },
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
    </div>
  );
}
