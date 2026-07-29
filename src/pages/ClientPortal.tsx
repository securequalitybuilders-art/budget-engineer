import React, { useState } from 'react';
import ApprovalInbox, { ApprovalRequest } from '../components/portal/ApprovalInbox';
import BuildingPassport from '../components/portal/BuildingPassport';
import { LogOut, Home, Inbox, FileCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_REQUESTS: ApprovalRequest[] = [
  {
    id: 'req1',
    title: 'Foundation Excavation Complete',
    description: 'Site has been cleared and trenches excavated according to structural specifications. Ready for blinding concrete.',
    amount: 14500,
    providerName: 'DzeNhare Earthworks Ltd',
    status: 'pending',
    dateRequested: '2026-07-24',
  },
  {
    id: 'req2',
    title: 'Site Preparation & Clearance',
    description: 'Initial site clearance and setting out.',
    amount: 5000,
    providerName: 'DzeNhare Earthworks Ltd',
    status: 'approved',
    dateRequested: '2026-07-10',
  }
];

export default function ClientPortal() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'inbox' | 'passport'>('inbox');
  const [requests, setRequests] = useState<ApprovalRequest[]>(MOCK_REQUESTS);

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
  };

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 font-sans">
      {/* Top Navbar */}
      <nav className="border-b border-stone-800 bg-stone-900 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-cyan-500 w-8 h-8 rounded-md flex items-center justify-center font-bold text-stone-950">
            D
          </div>
          <span className="font-semibold text-lg tracking-wide">DzeNhare Client</span>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors text-sm font-medium"
        >
          <LogOut size={16} /> Exit Portal
        </button>
      </nav>

      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-8 p-6 md:p-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <div className="mb-6 px-3">
            <h2 className="text-xl font-bold text-stone-100">My Project</h2>
            <p className="text-sm text-stone-400 mt-1">Avondale Residential</p>
          </div>

          <button 
            onClick={() => setActiveTab('inbox')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'inbox' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <Inbox size={18} />
            Approvals
            {requests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-auto bg-cyan-500 text-stone-950 text-xs font-bold px-2 py-0.5 rounded-full">
                {requests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'passport' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
            }`}
          >
            <FileCheck size={18} />
            Building Passport
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 animate-in fade-in duration-300">
          {activeTab === 'inbox' && (
            <ApprovalInbox 
              requests={requests}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {activeTab === 'passport' && (
            <BuildingPassport />
          )}
        </main>
      </div>
    </div>
  );
}
