import { useState } from 'react';
import { EcoCard, Stat } from '@/components/ecosystem/ui';
import { fmtCents } from '@/components/ecosystem/useEcosystemData';
import { calculateTco } from '@/engine/ecosystem/tco';

export function QuotingToolWidget() {
  const [unitPrice, setUnitPrice] = useState('1200');
  const [quantity, setQuantity] = useState('500');
  const [freight, setFreight] = useState('5');
  const [leadDays, setLeadDays] = useState('14');
  const [typicalLeadDays, setTypicalLeadDays] = useState('7');
  const [defectRate, setDefectRate] = useState('1.5');
  const [labourRate, setLabourRate] = useState('20000');

  const result = calculateTco({
    priceCents: Number(unitPrice) * 100,
    freightCents: Number(freight) * 100,
    onTimeDeliveryPct: 100 - Math.max(Number(leadDays) - Number(typicalLeadDays), 0) * 5,
    defectRatePct: Number(defectRate),
    laborDowntimeCostCentsPerDay: Number(labourRate) * 100,
    leadDays: Number(leadDays),
    typicalLeadDays: Number(typicalLeadDays),
  });

  const inputs = [
    { label: 'Unit price ($)', value: unitPrice, set: setUnitPrice },
    { label: 'Quantity', value: quantity, set: setQuantity },
    { label: 'Freight ($)', value: freight, set: setFreight },
    { label: 'Lead days', value: leadDays, set: setLeadDays },
    { label: 'Typical lead', value: typicalLeadDays, set: setTypicalLeadDays },
    { label: 'Defect rate %', value: defectRate, set: setDefectRate },
    { label: 'Site labour ($/day)', value: labourRate, set: setLabourRate },
  ];

  return (
    <EcoCard title="TCO quoting tool" subtitle="Build a quote that shows your true cost advantage" icon={<span aria-hidden>🧮</span>}>
      <div className="mb-3 grid grid-cols-2 gap-2">
        {inputs.map((i) => (
          <label key={i.label} className="block text-xs text-slate-400">
            {i.label}
            <input type="number" value={i.value} onChange={(e) => i.set(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" />
          </label>
        ))}
      </div>
      <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-400">Order value</span>
          <span className="font-bold text-slate-800">{fmtCents((Number(unitPrice) || 0) * (Number(quantity) || 0))}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Price" value={fmtCents(result.priceCents)} />
          <Stat label="Freight" value={fmtCents(result.freightCents)} />
          <Stat label="Downtime risk" value={fmtCents(result.downtimeCostCents)} tone={result.downtimeCostCents > 0 ? 'warn' : 'good'} />
          <Stat label="Defect risk" value={fmtCents(result.defectCostCents)} tone={result.defectCostCents > 0 ? 'warn' : 'good'} />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-brand/5 px-3 py-2">
        <span className="text-sm font-medium text-brand-accent">Total cost of ownership</span>
        <span className="text-lg font-bold text-brand-accent">{fmtCents(result.totalCostCents)}</span>
      </div>
    </EcoCard>
  );
}
