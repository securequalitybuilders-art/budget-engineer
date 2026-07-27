import React, { useState, useMemo } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { Package, Plus, X, DollarSign, Clock, Tag, Search, Edit2, Save, AlertTriangle, CheckCircle2, Filter } from 'lucide-react';

const CATEGORIES = ['material', 'equipment', 'service', 'labour'] as const;
const CATEGORY_LABELS = { material: 'Materials', equipment: 'Equipment', service: 'Services', labour: 'Labour' };

export default function CatalogManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCatalogItem = useProviderStore(s => s.addCatalogItem);
  const updateCatalogItem = useProviderStore(s => s.updateCatalogItem);
  const removeCatalogItem = useProviderStore(s => s.removeCatalogItem);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [item, setItem] = useState({ name: '', category: 'material' as typeof CATEGORIES[number], subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, stockQuantity: 0, tags: '', specifications: '' });

  if (!provider) return <div className="text-stone-500 p-12 text-center">Select a provider to manage their catalog</div>;

  const filteredItems = useMemo(() => {
    let items = provider.catalog;
    if (search) { const q = search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q))); }
    if (filterCat !== 'all') items = items.filter(i => i.category === filterCat);
    return items;
  }, [provider.catalog, search, filterCat]);

  const resetForm = () => setItem({ name: '', category: 'material', subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, stockQuantity: 0, tags: '', specifications: '' });

  const handleAdd = () => {
    addCatalogItem(providerId, {
      name: item.name, category: item.category, subcategory: item.subcategory, description: item.description,
      unit: item.unit, unitPrice: item.unitPrice, minOrder: item.minOrder, available: true,
      leadTimeDays: item.leadTimeDays, tags: item.tags.split(',').map(t => t.trim()).filter(Boolean),
      currency: 'USD', images: [], specifications: {},
    });
    resetForm(); setShowForm(false);
  };

  const handleEditSave = (itemId: string) => {
    updateCatalogItem(providerId, itemId, {
      name: item.name, category: item.category, subcategory: item.subcategory, description: item.description,
      unit: item.unit, unitPrice: item.unitPrice, minOrder: item.minOrder, leadTimeDays: item.leadTimeDays,
    });
    setEditingId(null); resetForm();
  };

  const startEdit = (ci: typeof provider.catalog[0]) => {
    setEditingId(ci.id); setItem({ name: ci.name, category: ci.category, subcategory: ci.subcategory, description: ci.description, unit: ci.unit, unitPrice: ci.unitPrice, minOrder: ci.minOrder, leadTimeDays: ci.leadTimeDays, stockQuantity: ci.stockQuantity ?? 0, tags: ci.tags.join(', '), specifications: '' });
    setShowForm(true);
  };

  const totalValue = provider.catalog.reduce((s, i) => s + i.unitPrice, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div><h3 className="text-lg font-semibold text-stone-200 flex items-center gap-2"><Package className="text-cyan-400" size={20} /> Catalog ({provider.catalog.length})</h3><p className="text-xs text-stone-500">{provider.catalog.length} items · Total value: ${totalValue.toLocaleString()}</p></div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); setEditingId(null); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Item'}</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search catalog..." className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
        <div className="flex gap-1 bg-stone-950 border border-stone-800 rounded-lg p-1">
          {[{ key: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ key: c, label: CATEGORY_LABELS[c] }))].map(c => (
            <button key={c.key} onClick={() => setFilterCat(c.key)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterCat === c.key ? 'bg-stone-800 text-stone-200' : 'text-stone-500 hover:text-stone-300'}`}>{c.label}</button>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-stone-300">{editingId ? 'Edit Item' : 'New Catalog Item'}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1"><label className="text-xs text-stone-500">Name *</label><input value={item.name} onChange={e => setItem(f => ({ ...f, name: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-xs text-stone-500">Category</label><select value={item.category} onChange={e => setItem(f => ({ ...f, category: e.target.value as any }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select></div>
            <div><label className="text-xs text-stone-500">Subcategory</label><input value={item.subcategory} onChange={e => setItem(f => ({ ...f, subcategory: e.target.value }))} placeholder="e.g. Cement, Steel" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Unit *</label><input value={item.unit} onChange={e => setItem(f => ({ ...f, unit: e.target.value }))} placeholder="m², ton, each" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Unit Price (USD)</label><input value={item.unitPrice || ''} onChange={e => setItem(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} type="number" min="0" step="0.01" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Min Order</label><input value={item.minOrder} onChange={e => setItem(f => ({ ...f, minOrder: parseInt(e.target.value) || 1 }))} type="number" min="1" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Stock Qty</label><input value={item.stockQuantity} onChange={e => setItem(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} type="number" min="0" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-500">Lead Time (days)</label><input value={item.leadTimeDays} onChange={e => setItem(f => ({ ...f, leadTimeDays: parseInt(e.target.value) || 1 }))} type="number" min="1" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div><label className="text-xs text-stone-500">Description</label><textarea value={item.description} onChange={e => setItem(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" /></div>
          <div><label className="text-xs text-stone-500">Tags</label><input value={item.tags} onChange={e => setItem(f => ({ ...f, tags: e.target.value }))} placeholder="cement, foundation, 32.5N" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">Cancel</button>
            <button onClick={editingId ? () => handleEditSave(editingId) : handleAdd} disabled={!item.name || !item.unit} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-600 text-white rounded-lg text-sm font-medium transition-colors"><Save size={14} /> {editingId ? 'Save Changes' : 'Add to Catalog'}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map(ci => (
          <div key={ci.id} className="bg-stone-950 border border-stone-800/50 rounded-lg p-4 flex flex-col gap-2 relative group hover:border-stone-700 transition-colors">
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => startEdit(ci)} className="p-1.5 text-stone-500 hover:text-cyan-400 bg-stone-900 rounded"><Edit2 size={12} /></button>
              <button onClick={() => removeCatalogItem(providerId, ci.id)} className="p-1.5 text-stone-500 hover:text-rose-400 bg-stone-900 rounded"><X size={12} /></button>
            </div>
            <div className="flex items-start justify-between">
              <div><h4 className="font-medium text-stone-200 text-sm">{ci.name}</h4><span className="text-xs text-stone-600">{ci.subcategory || ci.category}</span></div>
              <div className="text-right"><div className="text-emerald-400 font-semibold text-sm flex items-center gap-1"><DollarSign size={12} />{ci.unitPrice.toFixed(2)}</div><div className="text-xs text-stone-600">per {ci.unit}</div></div>
            </div>
            {ci.description && <p className="text-xs text-stone-500 line-clamp-2">{ci.description}</p>}
            <div className="flex flex-wrap gap-2 text-xs text-stone-600 mt-1">
              <span className="flex items-center gap-1"><Clock size={12} /> {ci.leadTimeDays}d</span>
              <span className="flex items-center gap-1"><Tag size={12} /> min {ci.minOrder}</span>
              {ci.stockQuantity !== undefined && <span className={`flex items-center gap-1 ${ci.stockQuantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{ci.stockQuantity > 0 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />} {ci.stockQuantity} in stock</span>}
            </div>
            {ci.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{ci.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-400">{t}</span>)}</div>}
          </div>
        ))}
        {filteredItems.length === 0 && <div className="col-span-full text-center py-12 text-stone-600 text-sm">{search || filterCat !== 'all' ? 'No items match your filters.' : 'No catalog items yet. Add your first product or service.'}</div>}
      </div>
    </div>
  );
}
