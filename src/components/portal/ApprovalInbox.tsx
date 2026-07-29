import React from 'react';
import { CheckCircle2, Clock, XCircle, ShieldCheck } from 'lucide-react';

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  amount: number;
  providerName: string;
  status: 'pending' | 'approved' | 'rejected';
  dateRequested: string;
}

interface ApprovalInboxProps {
  requests: ApprovalRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

export default function ApprovalInbox({ requests, onApprove, onReject }: ApprovalInboxProps) {
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-xl font-bold text-stone-100 mb-4 flex items-center gap-2">
          <ShieldCheck className="text-cyan-400" />
          Pending Approvals
        </h2>
        {pendingRequests.length === 0 ? (
          <div className="bg-stone-900 border border-stone-800 rounded-lg p-8 text-center text-stone-400">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-stone-700" />
            <p>You're all caught up. No pending approvals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map(req => (
              <div key={req.id} className="bg-stone-900 border border-stone-800 rounded-lg p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-stone-200">{req.title}</h3>
                    <p className="text-sm text-stone-400 mt-1">{req.providerName}</p>
                  </div>
                  <div className="text-lg font-bold text-emerald-400">{formatMoney(req.amount)}</div>
                </div>
                
                <p className="text-sm text-stone-300 bg-stone-950 p-3 rounded">{req.description}</p>
                
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => onApprove(req.id)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> Approve Release
                  </button>
                  <button 
                    onClick={() => onReject(req.id)}
                    className="bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium py-2 px-4 rounded-md transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-stone-100 mb-4 flex items-center gap-2">
          <Clock className="text-stone-400" />
          Recent Activity
        </h2>
        <div className="bg-stone-900 border border-stone-800 rounded-lg overflow-hidden">
          {pastRequests.length === 0 ? (
            <div className="p-4 text-center text-stone-400 text-sm">No recent activity.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950 border-b border-stone-800 text-stone-400">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Request</th>
                  <th className="p-3 font-medium">Provider</th>
                  <th className="p-3 font-medium">Amount</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 text-stone-300">
                {pastRequests.map(req => (
                  <tr key={req.id}>
                    <td className="p-3 whitespace-nowrap text-stone-400">{req.dateRequested}</td>
                    <td className="p-3">{req.title}</td>
                    <td className="p-3">{req.providerName}</td>
                    <td className="p-3">{formatMoney(req.amount)}</td>
                    <td className="p-3">
                      {req.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-medium">
                          <CheckCircle2 size={14} /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-xs font-medium">
                          <XCircle size={14} /> Rejected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
