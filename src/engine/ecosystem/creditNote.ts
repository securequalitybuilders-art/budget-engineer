export interface CreditNoteInput {
  rejectedAmountCents: number;
  reason: string;
  immediateReleasePct?: number;
  heldPct?: number;
}

export interface CreditNote {
  id: string;
  amountCents: number;
  immediateCents: number;
  heldCents: number;
  reason: string;
  status: 'issued' | 'settled';
  createdAt: string;
  settledAt?: string;
}

const DEFAULT_IMMEDIATE_PCT = 90;
const DEFAULT_HELD_PCT = 10;

export function generateCreditNote(input: CreditNoteInput): CreditNote {
  const immediateReleasePct = input.immediateReleasePct ?? DEFAULT_IMMEDIATE_PCT;
  const heldPct = input.heldPct ?? DEFAULT_HELD_PCT;
  return {
    id: crypto.randomUUID(),
    amountCents: Math.round(input.rejectedAmountCents),
    immediateCents: Math.round((input.rejectedAmountCents * immediateReleasePct) / 100),
    heldCents: Math.round((input.rejectedAmountCents * heldPct) / 100),
    reason: input.reason,
    status: 'issued',
    createdAt: new Date().toISOString(),
  };
}

export function settleCreditNote(note: CreditNote): CreditNote {
  if (note.status === 'settled') return note;
  return { ...note, status: 'settled', settledAt: new Date().toISOString() };
}

export function creditNoteTotals(notes: CreditNote[]): {
  count: number;
  totalCents: number;
  immediateCents: number;
  heldCents: number;
  settledCents: number;
} {
  return notes.reduce(
    (acc, n) => ({
      count: acc.count + 1,
      totalCents: acc.totalCents + n.amountCents,
      immediateCents: acc.immediateCents + n.immediateCents,
      heldCents: acc.heldCents + n.heldCents,
      settledCents: acc.settledCents + (n.status === 'settled' ? n.heldCents : 0),
    }),
    { count: 0, totalCents: 0, immediateCents: 0, heldCents: 0, settledCents: 0 }
  );
}
