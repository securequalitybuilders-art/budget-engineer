import React from 'react';

export interface Task {
  id: string;
  name: string;
  startOffset: number; // days from project start
  duration: number; // days
  progress: number; // 0-100
  status: 'pending' | 'in-progress' | 'completed' | 'delayed';
}

interface GanttChartProps {
  tasks: Task[];
  totalDays: number;
}

export default function GanttChart({ tasks, totalDays }: GanttChartProps) {
  // Simple CSS-grid based Gantt Chart
  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'in-progress': return 'bg-cyan-500';
      case 'delayed': return 'bg-rose-500';
      default: return 'bg-stone-500';
    }
  };

  return (
    <div className="w-full overflow-x-auto bg-stone-900 rounded-lg border border-stone-800 p-4">
      <div className="min-w-[800px]">
        {/* Timeline Header */}
        <div className="flex border-b border-stone-700 pb-2 mb-2 text-xs text-stone-400">
          <div className="w-1/4 shrink-0 font-medium px-2">Task</div>
          <div className="w-3/4 flex relative h-4">
            {Array.from({ length: 11 }).map((_, i) => (
              <div 
                key={i} 
                className="absolute text-[10px] border-l border-stone-700 h-full pl-1"
                style={{ left: `${(i / 10) * 100}%` }}
              >
                Day {Math.floor((i / 10) * totalDays)}
              </div>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="flex flex-col gap-3 mt-4">
          {tasks.map((task) => {
            const leftPercent = (task.startOffset / totalDays) * 100;
            const widthPercent = (task.duration / totalDays) * 100;
            
            return (
              <div key={task.id} className="flex items-center text-sm">
                <div className="w-1/4 shrink-0 px-2 truncate text-stone-300" title={task.name}>
                  {task.name}
                </div>
                <div className="w-3/4 relative h-6 bg-stone-800/50 rounded overflow-hidden">
                  <div 
                    className={`absolute h-full rounded flex items-center px-2 text-[10px] font-bold text-white transition-all ${getStatusColor(task.status)}`}
                    style={{ 
                      left: `${leftPercent}%`, 
                      width: `${widthPercent}%`,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'
                    }}
                  >
                    <div 
                      className="absolute left-0 top-0 h-full bg-white/20 transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                    <span className="relative z-10 hidden sm:inline-block drop-shadow-md">
                      {task.progress}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
