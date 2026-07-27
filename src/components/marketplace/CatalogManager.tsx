import React, { useState } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { Package, Plus, X, DollarSign, Clock, Tag } from 'lucide-react';

export default function CatalogManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCatalogItem = useProviderStore(s => s.addCatalogItem);
  const removeCatalogItem = useProviderStore(s => s.removeCatalogItem);
  const [showForm, setShowForm] = useState(false);
  const [item, setItem] = useState({ name: '', category: 'material' as const, subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, tags: '' });

  if (!provider) return <div className="text-stone-500 p-8 text-center">Select a provider to manage their catalog</div>;

  const handleAdd = () => {
    addCatalogItem(providerId, {
      name: item.name, category: item.category, subcategory: item.subcategory, description: item.description,
      unit: item.unit, unitPrice: item.unitPrice, minOrder: item.minOrder, available: true,
      leadTimeDays: item.leadTimeDays, tags: item.tags.split(',').map(t => t.trim()).filter(Boolean), currency: 'USD',
    });
    setItem({ name: '', category: 'material', subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, tags: '' });
    setShowForm(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Package className="text-cyan-400" size={20} /><h3 className="text-lg font-semibold text-stone-200">Catalog ({provider.catalog.length})</h3></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> Add Item</button>
      </div>
      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-stone-400">Name</label><input value={item.name} onChange={e => setItem(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-xs text-stone-400">Category</label><select value={item.category} onChange={e => setItem(f => ({ ...f, category: e.target.value as any }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none"><option value="material">Material</option><option value="equipment">Equipment</option><option value="service">Service</option></select></div>
            <div><label className="text-xs text-stone-400">Subcategory</label><input value={item.subcategory} onChange={e => setItem(f => ({ ...f, subcategory: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Unit</label><input value={item.unit} onChange={e => setItem(f => ({ ...f, unit: e.target.value }))} placeholder="m², ton, each" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Unit Price (USD)</label><input value={item.unitPrice || ''} onChange={e => setItem(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} type="number" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Lead Time (days)</label><input value={item.leadTimeDays} onChange={e => setItem(f => ({ ...f, leadTimeDays: parseInt(e.target.value) || 1 }))} type="number" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-stone-400">Description</label><textarea value={item.description} onChange={e => setItem(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" /></div>
          <div><label className="text-xs text-stone-400">Tags (comma separated)</label><input value={item.tags} onChange={e => setItem(f => ({ ...f, tags: e.target.value }))} placeholder="cement, foundation, structural" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
            <button onClick={handleAdd} disabled={!item.name || !item.unit} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded-lg text-sm font-medium transition-colors">Add to Catalog</button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {provider.catalog.map(ci => (
          <div key={ci.id} className="bg-stone-950 border border-stone-800/50 rounded-lg p-4 flex flex-col gap-2 relative group">
            <button onClick={() => removeCatalogItem(providerId, ci.id)} className="absolute top-2 right-2 p-1 text-stone-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"><X size={14} /></button>
            <div className="flex items-start justify-between">
              <div><h4 className="font-medium text-stone-200 text-sm">{ci.name}</h4><span className="text-xs text-stone-500">{ci.subcategory || ci.category}</span></div>
              <div className="text-right"><div className="text-emerald-400 font-semibold text-sm flex items-center gap-1"><DollarSign size={12} />{ci.unitPrice.toFixed(2)}</div><div className="text-xs text-stone-500">per {ci.unit}</div></div>
            </div>
            <div className="flex gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1"><Clock size={12} /> {ci.leadTimeDays} days</span>
              <span className="flex items-center gap-1"><Tag size={12} /> min {ci.minOrder} {ci.unit}</span>
            </div>
          </div>
        ))}
        {provider.catalog.length === 0 && <div className="col-span-full text-center py-8 text-stone-600 text-sm">No catalog items yet. Add your first product or service.</div>}
      </div>
    </div>
  );
}
