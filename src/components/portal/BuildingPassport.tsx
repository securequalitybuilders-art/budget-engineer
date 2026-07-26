import React from 'react';
import { BookOpen, FileText, Download, CheckCircle2, Shield } from 'lucide-react';

export default function BuildingPassport() {
  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-gradient-to-r from-stone-900 to-stone-800 border border-stone-700 rounded-xl p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <BookOpen size={120} />
        </div>
        
        <div className="flex-1 z-10">
          <h1 className="text-3xl font-bold text-stone-100 mb-2">Digital Building Passport</h1>
          <p className="text-stone-400">
            A permanent record of your project's materials, warranties, compliance certificates, and maintenance schedules.
          </p>
          
          <div className="flex items-center gap-2 mt-6 text-emerald-400 bg-emerald-400/10 w-fit px-3 py-1.5 rounded-full text-sm font-medium">
            <CheckCircle2 size={16} /> Certified Authentic
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-stone-800 rounded-lg text-cyan-400">
              <FileText size={20} />
            </div>
            <h3 className="text-lg font-semibold text-stone-200">As-Built Drawings</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 bg-stone-950 rounded border border-stone-800/50 group hover:border-stone-700 transition-colors cursor-pointer">
              <div className="text-sm font-medium text-stone-300">Final Floor Plans</div>
              <Download size={16} className="text-stone-500 group-hover:text-cyan-400 transition-colors" />
            </li>
            <li className="flex items-center justify-between p-3 bg-stone-950 rounded border border-stone-800/50 group hover:border-stone-700 transition-colors cursor-pointer">
              <div className="text-sm font-medium text-stone-300">MEP Services Layout</div>
              <Download size={16} className="text-stone-500 group-hover:text-cyan-400 transition-colors" />
            </li>
          </ul>
        </div>

        <div className="bg-stone-900 border border-stone-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-stone-800 rounded-lg text-emerald-400">
              <Shield size={20} />
            </div>
            <h3 className="text-lg font-semibold text-stone-200">Warranties & Certificates</h3>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 bg-stone-950 rounded border border-stone-800/50 group hover:border-stone-700 transition-colors cursor-pointer">
              <div>
                <div className="text-sm font-medium text-stone-300">Roofing Warranty</div>
                <div className="text-xs text-stone-500">Valid until 2046</div>
              </div>
              <Download size={16} className="text-stone-500 group-hover:text-emerald-400 transition-colors" />
            </li>
            <li className="flex items-center justify-between p-3 bg-stone-950 rounded border border-stone-800/50 group hover:border-stone-700 transition-colors cursor-pointer">
              <div>
                <div className="text-sm font-medium text-stone-300">Electrical Compliance Certificate</div>
                <div className="text-xs text-stone-500">Issued by Authority</div>
              </div>
              <Download size={16} className="text-stone-500 group-hover:text-emerald-400 transition-colors" />
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
