import { DollarSign, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface BudgetCategory {
  id: string;
  name: string;
  budgeted: number;
  actual: number;
}

interface BudgetVsActualProps {
  categories: BudgetCategory[];
}

export default function BudgetVsActual({ categories }: BudgetVsActualProps) {
  const totalBudgeted = categories.reduce((sum, cat) => sum + cat.budgeted, 0);
  const totalActual = categories.reduce((sum, cat) => sum + cat.actual, 0);
  const totalVariance = totalBudgeted - totalActual;
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-stone-400 text-sm mb-2">
            <DollarSign size={16} /> Total Budgeted
          </div>
          <div className="text-2xl font-bold text-stone-200">{formatMoney(totalBudgeted)}</div>
        </div>
        
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-stone-400 text-sm mb-2">
            <DollarSign size={16} /> Total Actual (Spent)
          </div>
          <div className="text-2xl font-bold text-stone-200">{formatMoney(totalActual)}</div>
        </div>

        <div className={`border rounded-lg p-4 ${totalVariance >= 0 ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-rose-950/30 border-rose-900/50'}`}>
          <div className="flex items-center gap-2 text-stone-400 text-sm mb-2">
            {totalVariance >= 0 ? <CheckCircle2 size={16} className="text-emerald-500"/> : <AlertTriangle size={16} className="text-rose-500" />}
            Variance
          </div>
          <div className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalVariance >= 0 ? '+' : ''}{formatMoney(totalVariance)}
          </div>
        </div>
      </div>

      {/* Categories Breakdown */}
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-stone-300 mb-4">Category Breakdown</h3>
        <div className="flex flex-col gap-4">
          {categories.map(cat => {
            const variance = cat.budgeted - cat.actual;
            const percentSpent = cat.budgeted > 0 ? (cat.actual / cat.budgeted) * 100 : 0;
            const isOver = variance < 0;

            return (
              <div key={cat.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-end text-sm">
                  <span className="font-medium text-stone-300">{cat.name}</span>
                  <div className="flex gap-4 text-xs">
                    <span className="text-stone-400">Budget: {formatMoney(cat.budgeted)}</span>
                    <span className="text-stone-200">Actual: {formatMoney(cat.actual)}</span>
                    <span className={`w-20 text-right ${isOver ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isOver ? 'Over' : 'Under'}: {formatMoney(Math.abs(variance))}
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all ${isOver ? 'bg-rose-500' : 'bg-cyan-500'}`}
                    style={{ width: `${Math.min(percentSpent, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
