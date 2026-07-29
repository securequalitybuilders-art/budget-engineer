import { useState } from 'react';
import GanttChart, { Task } from './GanttChart';
import BudgetVsActual, { BudgetCategory } from './BudgetVsActual';
import { Play, Calendar, DollarSign, Users } from 'lucide-react';

const MOCK_TASKS: Task[] = [
  { id: 't1', name: 'Site Preparation & Clearance', startOffset: 0, duration: 5, progress: 100, status: 'completed' },
  { id: 't2', name: 'Foundation Excavation', startOffset: 5, duration: 7, progress: 100, status: 'completed' },
  { id: 't3', name: 'Substructure Brickwork', startOffset: 12, duration: 10, progress: 80, status: 'in-progress' },
  { id: 't4', name: 'Ground Floor Slab', startOffset: 22, duration: 5, progress: 0, status: 'pending' },
  { id: 't5', name: 'Superstructure Brickwork', startOffset: 27, duration: 20, progress: 0, status: 'pending' },
  { id: 't6', name: 'Roof Timber Framing', startOffset: 47, duration: 14, progress: 0, status: 'pending' },
  { id: 't7', name: 'Roof Covering & Plumbing', startOffset: 61, duration: 10, progress: 0, status: 'pending' },
];

const MOCK_BUDGET: BudgetCategory[] = [
  { id: 'c1', name: 'Substructure', budgeted: 15000, actual: 14500 },
  { id: 'c2', name: 'Superstructure', budgeted: 35000, actual: 5000 },
  { id: 'c3', name: 'Roofing', budgeted: 12000, actual: 0 },
  { id: 'c4', name: 'Finishes', budgeted: 20000, actual: 0 },
  { id: 'c5', name: 'Services (MEP)', budgeted: 18000, actual: 1200 },
];

export default function ExecutionPanel() {
  const [activeTab, setActiveTab] = useState<'schedule' | 'financials' | 'resources'>('schedule');

  return (
    <div className="flex h-full flex-col bg-[var(--bg-primary)] p-4 md:p-6 overflow-y-auto">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-100 flex items-center gap-2">
            <Play className="text-emerald-500" size={24} /> 
            Execution Monitor
          </h2>
          <p className="text-stone-400 text-sm mt-1">
            Track live construction progress, schedules, and escrow-released payments.
          </p>
        </div>
        
        <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
          <button 
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <Calendar size={16} /> Schedule
          </button>
          <button 
            onClick={() => setActiveTab('financials')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'financials' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <DollarSign size={16} /> Financials
          </button>
          <button 
            onClick={() => setActiveTab('resources')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'resources' ? 'bg-stone-800 text-stone-200 shadow' : 'text-stone-400 hover:text-stone-300 hover:bg-stone-800/50'}`}
          >
            <Users size={16} /> Resources
          </button>
        </div>
      </div>

      <div className="flex-1">
        {activeTab === 'schedule' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4 text-stone-300 font-medium text-lg">Project Gantt Chart</div>
            <GanttChart tasks={MOCK_TASKS} totalDays={90} />
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="mb-4 text-stone-300 font-medium text-lg">Budget vs Actual (Escrow Released)</div>
            <BudgetVsActual categories={MOCK_BUDGET} />
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center justify-center h-64 border border-dashed border-stone-700 rounded-lg bg-stone-900/50">
            <div className="text-center">
              <Users className="mx-auto text-stone-400 mb-2" size={32} />
              <h3 className="text-stone-300 font-medium">Resource Allocation</h3>
              <p className="text-stone-400 text-sm mt-1">Provider labor tracking coming soon.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
