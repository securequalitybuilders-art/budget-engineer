import { useState, useMemo } from 'react';
import { useProviderStore } from '../../stores/providerStore';
import { Package, Plus, X, DollarSign, Clock, Tag, Search, Edit2, Save, AlertTriangle, CheckCircle2, Copy, Download, Upload, Grid3X3, List, Image, TrendingUp, CheckSquare, Square, Trash2, Percent, AlertOctagon } from 'lucide-react';

const CATEGORIES = ['material', 'equipment', 'service', 'labour'] as const;
const CATEGORY_LABELS: Record<string, string> = { material: 'Materials', equipment: 'Equipment', service: 'Services', labour: 'Labour' };
const CATEGORY_COLORS: Record<string, string> = { material: 'text-cyan-400 bg-cyan-500/10', equipment: 'text-violet-400 bg-violet-500/10', service: 'text-emerald-400 bg-emerald-500/10', labour: 'text-amber-400 bg-amber-500/10' };
const SUBCATEGORY_OPTIONS: Record<string, string[]> = { material: ['Cement & Binders', 'Steel & Reinforcement', 'Aggregates & Sand', 'Roofing & Cladding', 'Plumbing & Drainage', 'Electrical & Lighting', 'Finishes & Tiles', 'Timber & Joinery', 'Glass & Glazing', 'Paint & Coatings', 'Insulation', 'Waterproofing', 'Hardware & Fixings', 'Adhesives & Sealants', 'Site Safety'], equipment: ['Earthmoving', 'Concrete Equipment', 'Hoisting & Lifting', 'Compaction', 'Power Generation', 'Pumping', 'Scaffolding', 'Formwork', 'Surveying', 'Safety Equipment', 'Hand Tools'], service: ['Consulting', 'Design', 'Installation', 'Maintenance', 'Testing', 'Inspection', 'Training', 'Waste Management', 'Logistics'], labour: ['General Labor', 'Skilled Trade', 'Supervisory', 'Safety Officer', 'Operator', 'Technician'] };
const LOW_STOCK_THRESHOLD = 10;

function generatePriceHistory(basePrice: number): { date: string; price: number }[] {
  const history: { date: string; price: number }[] = [];
  let price = basePrice * 0.85;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    price += (Math.random() - 0.45) * basePrice * 0.05;
    history.push({ date: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), price: Math.round(price * 100) / 100 });
  }
  return history;
}

function calculateTrend(history: { price: number }[]): { direction: 'up' | 'down' | 'stable'; pct: number } {
  if (history.length < 2) return { direction: 'stable', pct: 0 };
  const first = history[0].price, last = history[history.length - 1].price;
  const pct = ((last - first) / first) * 100;
  return { direction: pct > 2 ? 'up' : pct < -2 ? 'down' : 'stable', pct: Math.round(pct * 10) / 10 };
}

export default function CatalogManager({ providerId }: { providerId: string }) {
  const provider = useProviderStore(s => s.providers.find(p => p.id === providerId));
  const addCatalogItem = useProviderStore(s => s.addCatalogItem);
  const updateCatalogItem = useProviderStore(s => s.updateCatalogItem);
  const removeCatalogItem = useProviderStore(s => s.removeCatalogItem);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'lead' | 'stock'>('name');
  const [showPriceHistory, setShowPriceHistory] = useState<string | null>(null);
  const [customCategories] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkPricePct, setBulkPricePct] = useState(0);
  const [showBulkPrice, setShowBulkPrice] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(LOW_STOCK_THRESHOLD);
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);
  const [item, setItem] = useState({ name: '', category: 'material' as typeof CATEGORIES[number], subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, stockQuantity: 0, tags: '', specifications: '' });

  if (!provider) return <div className="text-stone-400 p-12 text-center">Select a provider to manage their catalog</div>;

  const allCategories = [...CATEGORIES, ...customCategories.filter(c => !CATEGORIES.includes(c as any))];

  const filteredItems = useMemo(() => {
    let items = [...provider.catalog];
    if (search) { const q = search.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.tags.some(t => t.toLowerCase().includes(q)) || i.subcategory.toLowerCase().includes(q)); }
    if (filterCat !== 'all') items = items.filter(i => i.category === filterCat);
    items.sort((a, b) => sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'price' ? a.unitPrice - b.unitPrice : sortBy === 'stock' ? (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0) : a.leadTimeDays - b.leadTimeDays);
    return items;
  }, [provider.catalog, search, filterCat, sortBy]);

  const priceHistories = useMemo(() => {
    const map = new Map<string, { history: { date: string; price: number }[]; trend: ReturnType<typeof calculateTrend> }>();
    for (const item of provider.catalog) {
      const history = generatePriceHistory(item.unitPrice);
      map.set(item.id, { history, trend: calculateTrend(history) });
    }
    return map;
  }, [provider.catalog]);

  const lowStockItems = useMemo(() => provider.catalog.filter(i => i.stockQuantity !== undefined && i.stockQuantity <= lowStockThreshold), [provider.catalog, lowStockThreshold]);
  const outOfStockItems = useMemo(() => provider.catalog.filter(i => i.stockQuantity !== undefined && i.stockQuantity <= 0), [provider.catalog]);

  const resetForm = () => setItem({ name: '', category: 'material', subcategory: '', description: '', unit: '', unitPrice: 0, minOrder: 1, leadTimeDays: 7, stockQuantity: 0, tags: '', specifications: '' });

  const handleAdd = () => {
    addCatalogItem(providerId, { name: item.name, category: item.category, subcategory: item.subcategory, description: item.description, unit: item.unit, unitPrice: item.unitPrice, minOrder: item.minOrder, available: true, leadTimeDays: item.leadTimeDays, tags: item.tags.split(',').map(t => t.trim()).filter(Boolean), currency: 'USD', images: [], specifications: {} });
    resetForm(); setShowForm(false);
  };

  const handleEditSave = (itemId: string) => { updateCatalogItem(providerId, itemId, { name: item.name, category: item.category, subcategory: item.subcategory, description: item.description, unit: item.unit, unitPrice: item.unitPrice, minOrder: item.minOrder, leadTimeDays: item.leadTimeDays }); setEditingId(null); resetForm(); };

  const startEdit = (ci: typeof provider.catalog[0]) => { setEditingId(ci.id); setItem({ name: ci.name, category: ci.category, subcategory: ci.subcategory, description: ci.description, unit: ci.unit, unitPrice: ci.unitPrice, minOrder: ci.minOrder, leadTimeDays: ci.leadTimeDays, stockQuantity: ci.stockQuantity ?? 0, tags: ci.tags.join(', '), specifications: '' }); setShowForm(true); };

  const duplicateItem = (ci: typeof provider.catalog[0]) => {
    addCatalogItem(providerId, { name: `${ci.name} (copy)`, category: ci.category, subcategory: ci.subcategory, description: ci.description, unit: ci.unit, unitPrice: ci.unitPrice, minOrder: ci.minOrder, available: ci.available, leadTimeDays: ci.leadTimeDays, tags: ci.tags, currency: 'USD', images: [], specifications: {} });
  };

  const toggleSelect = (id: string) => { setSelectedItems(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (selectedItems.size === filteredItems.length) setSelectedItems(new Set()); else setSelectedItems(new Set(filteredItems.map(i => i.id))); };
  const bulkDelete = () => { selectedItems.forEach(id => removeCatalogItem(providerId, id)); setSelectedItems(new Set()); setSelectMode(false); };
  const bulkPriceUpdate = () => { selectedItems.forEach(id => { const item = provider.catalog.find(i => i.id === id); if (item) updateCatalogItem(providerId, id, { unitPrice: Math.round(item.unitPrice * (1 + bulkPricePct / 100) * 100) / 100 }); }); setSelectedItems(new Set()); setShowBulkPrice(false); };

  const exportCSV = () => {
    const headers = 'Name,Category,Subcategory,Description,Unit,Unit Price,Min Order,Lead Time Days,Stock,Tags\n';
    const rows = provider.catalog.map(i => `"${i.name}","${i.category}","${i.subcategory}","${i.description.replace(/"/g, '""')}","${i.unit}",${i.unitPrice},${i.minOrder},${i.leadTimeDays},${i.stockQuantity ?? ''},"${i.tags.join('; ')}"`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${provider?.name ?? 'catalog'}-export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importCSV = () => {
    const lines = importText.trim().split('\n').slice(1);
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      if (parts.length < 6) continue;
      const cat = (parts[1] || 'material') as 'material' | 'equipment' | 'service' | 'labour';
      addCatalogItem(providerId, { name: parts[0], category: cat, subcategory: parts[2] || '', description: parts[3] || '', unit: parts[4], unitPrice: parseFloat(parts[5]) || 0, minOrder: parseInt(parts[6]) || 1, leadTimeDays: parseInt(parts[7]) || 7, stockQuantity: parseInt(parts[8]) || 0, tags: (parts[9] || '').split(';').map((t: string) => t.trim()).filter(Boolean), currency: 'USD', available: true, images: [], specifications: {} });
    }
    setImportText(''); setShowImport(false);
  };

  const totalValue = provider.catalog.reduce((s, i) => s + i.unitPrice, 0);
  const avgLeadTime = provider.catalog.length > 0 ? Math.round(provider.catalog.reduce((s, i) => s + i.leadTimeDays, 0) / provider.catalog.length) : 0;
  const outOfStock = outOfStockItems.length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Total Items</div><div className="text-2xl font-bold text-stone-200">{provider.catalog.length}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Portfolio Value</div><div className="text-2xl font-bold text-emerald-400">${totalValue.toLocaleString()}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Avg Lead Time</div><div className="text-2xl font-bold text-amber-400">{avgLeadTime}d</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4"><div className="text-stone-400 text-xs mb-1">Out of Stock</div><div className={`text-2xl font-bold ${outOfStock > 0 ? 'text-rose-400' : 'text-stone-400'}`}>{outOfStock}</div></div>
        <div className="bg-stone-900 border border-stone-800 rounded-lg p-4">
          <div className="text-stone-400 text-xs mb-1">Low Stock Alerts</div>
          <button onClick={() => setShowAlerts(!showAlerts)} className={`text-2xl font-bold flex items-center gap-2 ${lowStockItems.length > 0 ? 'text-amber-400' : 'text-stone-400'} hover:underline`}>
            {lowStockItems.length} <AlertOctagon size={16} />
          </button>
        </div>
      </div>

      {showAlerts && lowStockItems.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-semibold text-amber-400 flex items-center gap-2"><AlertTriangle size={16} /> Inventory Alerts</h4><button onClick={() => setShowAlerts(false)} className="text-stone-400 hover:text-stone-300"><X size={14} /></button></div>
          <div className="flex items-center gap-3 mb-3"><label className="text-xs text-stone-400">Low stock threshold:</label><input type="number" min="1" value={lowStockThreshold} onChange={e => setLowStockThreshold(parseInt(e.target.value) || 5)} className="w-20 bg-stone-900 border border-stone-800 rounded px-2 py-1 text-sm text-stone-200 outline-none" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">{lowStockItems.map(i => (
            <div key={i.id} className="flex items-center justify-between bg-stone-950 border border-stone-800 rounded-lg p-3">
              <div><div className="text-sm text-stone-200">{i.name}</div><div className="text-xs text-stone-400">{i.stockQuantity} in stock</div></div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${i.stockQuantity && i.stockQuantity <= 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{i.stockQuantity && i.stockQuantity <= 0 ? 'Out of stock' : `${i.stockQuantity} remaining`}</span>
            </div>
          ))}</div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Package className="text-cyan-400" size={20} /><h3 className="text-lg font-semibold text-stone-200">Catalog Inventory</h3></div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex bg-stone-950 border border-stone-800 rounded-lg p-0.5">
            <button onClick={() => { setViewMode('grid'); setSelectMode(false); }} className={`p-1.5 rounded ${viewMode === 'grid' && !selectMode ? 'bg-stone-800 text-stone-200' : 'text-stone-400'}`}><Grid3X3 size={14} /></button>
            <button onClick={() => { setViewMode('list'); setSelectMode(false); }} className={`p-1.5 rounded ${viewMode === 'list' && !selectMode ? 'bg-stone-800 text-stone-200' : 'text-stone-400'}`}><List size={14} /></button>
            <button onClick={() => setSelectMode(!selectMode)} className={`p-1.5 rounded ${selectMode ? 'bg-cyan-500/10 text-cyan-400' : 'text-stone-400'}`}><CheckSquare size={14} /></button>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 rounded-lg transition-colors"><Download size={12} /> Export</button>
          <button onClick={() => setShowImport(!showImport)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-stone-400 hover:text-stone-200 bg-stone-950 border border-stone-800 rounded-lg transition-colors"><Upload size={12} /> Import</button>
          <button onClick={() => { resetForm(); setShowForm(!showForm); setEditingId(null); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors"><Plus size={16} /> {showForm ? 'Cancel' : 'Add Item'}</button>
        </div>
      </div>

      {showImport && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-stone-300">Import from CSV</h4><button onClick={() => setShowImport(false)} className="text-stone-400 hover:text-stone-300"><X size={16} /></button></div>
          <p className="text-xs text-stone-400">Paste CSV data (header: Name,Category,Subcategory,Description,Unit,Unit Price,Min Order,Lead Time,Stock,Tags)</p>
          <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={5} className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none font-mono" placeholder="Name,Category,Subcategory,Description,Unit,Unit Price,Min Order,Lead Time,Stock,Tags&#10;Portland Cement 32.5N,material,Cement &amp; Binders,Ordinary Portland Cement,ton,320.00,1,5,50,cement;foundation" />
          <div className="flex gap-2 justify-end"><button onClick={() => setShowImport(false)} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button><button onClick={importCSV} disabled={!importText.trim()} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-sm font-medium transition-colors"><Upload size={14} /> Import Items</button></div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, description, tags..." className="w-full bg-stone-950 border border-stone-800 rounded-lg pl-10 pr-4 py-2.5 text-sm text-stone-200 outline-none focus:border-stone-600" /></div>
        <div className="flex flex-wrap gap-1 bg-stone-950 border border-stone-800 rounded-lg p-1">
          {[{ key: 'all', label: 'All' }, ...allCategories.map(c => ({ key: c, label: CATEGORY_LABELS[c] ?? c }))].map(c => (
            <button key={c.key} onClick={() => setFilterCat(c.key)} className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${filterCat === c.key ? 'bg-stone-800 text-stone-200' : 'text-stone-400 hover:text-stone-300'}`}>{c.label}</button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-400 outline-none"><option value="name">Name</option><option value="price">Price</option><option value="lead">Lead Time</option><option value="stock">Stock</option></select>
      </div>

      {showForm && (
        <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-stone-300">{editingId ? 'Edit Item' : 'New Catalog Item'}</h4><button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="text-stone-400 hover:text-stone-300"><X size={16} /></button></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2"><label className="text-xs text-stone-400">Item Name *</label><input value={item.name} onChange={e => setItem(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Portland Cement 32.5N" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none focus:border-cyan-500/50" /></div>
            <div><label className="text-xs text-stone-400">Category</label><select value={item.category} onChange={e => { setItem(f => ({ ...f, category: e.target.value as any, subcategory: '' })); }} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none">{allCategories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</option>)}</select></div>
            <div><label className="text-xs text-stone-400">Subcategory</label><select value={item.subcategory} onChange={e => setItem(f => ({ ...f, subcategory: e.target.value }))} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none"><option value="">Select</option>{(SUBCATEGORY_OPTIONS[item.category] ?? []).map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            <div><label className="text-xs text-stone-400">Unit *</label><input value={item.unit} onChange={e => setItem(f => ({ ...f, unit: e.target.value }))} placeholder="m², ton, each" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Unit Price (USD)</label><input value={item.unitPrice || ''} onChange={e => setItem(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} type="number" min="0" step="0.01" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Min Order</label><input value={item.minOrder} onChange={e => setItem(f => ({ ...f, minOrder: parseInt(e.target.value) || 1 }))} type="number" min="1" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Stock Qty</label><input value={item.stockQuantity || ''} onChange={e => setItem(f => ({ ...f, stockQuantity: parseInt(e.target.value) || 0 }))} type="number" min="0" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
            <div><label className="text-xs text-stone-400">Lead Time (days)</label><input value={item.leadTimeDays} onChange={e => setItem(f => ({ ...f, leadTimeDays: parseInt(e.target.value) || 1 }))} type="number" min="1" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3"><div><label className="text-xs text-stone-400">Description</label><textarea value={item.description} onChange={e => setItem(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none resize-none" placeholder="Product description, specifications, grade..." /></div>
            <div><label className="text-xs text-stone-400">Tags</label><input value={item.tags} onChange={e => setItem(f => ({ ...f, tags: e.target.value }))} placeholder="cement, foundation, 32.5N, structural" className="w-full mt-1 bg-stone-900 border border-stone-800 rounded px-3 py-2 text-sm text-stone-200 outline-none" /><p className="text-xs text-stone-400 mt-1">Comma-separated keywords for search</p></div></div>
          <div className="flex items-center gap-3 p-3 bg-stone-900 rounded-lg border border-dashed border-stone-700 cursor-pointer hover:border-stone-600 transition-colors"><Image size={16} className="text-stone-400" /><span className="text-sm text-stone-400">Add product images (optional — up to 5)</span></div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200">Cancel</button>
            <button onClick={editingId ? () => handleEditSave(editingId) : handleAdd} disabled={!item.name || !item.unit} className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-sm font-medium transition-colors"><Save size={14} /> {editingId ? 'Save Changes' : 'Add to Catalog'}</button>
          </div>
        </div>
      )}

      {selectMode && selectedItems.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <span className="text-sm text-stone-300">{selectedItems.size} selected</span>
          <button onClick={bulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={12} /> Delete</button>
          <button onClick={() => setShowBulkPrice(!showBulkPrice)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 rounded-lg transition-colors"><Percent size={12} /> Adjust Price</button>
          <button onClick={() => { setSelectedItems(new Set()); setSelectMode(false); }} className="text-xs text-stone-400 hover:text-stone-300 ml-auto">Cancel Selection</button>
        </div>
      )}

      {showBulkPrice && (
        <div className="flex items-center gap-3 p-3 bg-stone-950 border border-stone-800 rounded-lg">
          <label className="text-xs text-stone-400">Price change %:</label>
          <input type="number" value={bulkPricePct} onChange={e => setBulkPricePct(parseFloat(e.target.value) || 0)} className="w-24 bg-stone-900 border border-stone-800 rounded px-2 py-1.5 text-sm text-stone-200 outline-none" placeholder="e.g. 10 or -5" />
          <span className="text-xs text-stone-400">%</span>
          <button onClick={bulkPriceUpdate} disabled={selectedItems.size === 0} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 disabled:text-stone-400 text-white rounded-lg text-xs font-medium transition-colors">Apply</button>
          <button onClick={() => setShowBulkPrice(false)} className="px-3 py-1.5 text-xs text-stone-400 hover:text-stone-300">Cancel</button>
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div className="text-center py-16 text-stone-400"><Package size={48} className="mx-auto mb-4 text-stone-700" /><p className="text-sm">{search || filterCat !== 'all' ? 'No items match your filters. Try adjusting your search.' : 'No catalog items yet. Click "Add Item" to list your first product or service.'}</p></div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map(ci => {
            const ph = priceHistories.get(ci.id);
            const isSelected = selectedItems.has(ci.id);
            return (
              <div key={ci.id} className={`bg-stone-950 border ${isSelected ? 'border-cyan-500/50 ring-1 ring-cyan-500/20' : 'border-stone-800/50'} rounded-lg p-4 flex flex-col gap-2 relative group hover:border-stone-700 transition-all`}>
                {selectMode && <button onClick={() => toggleSelect(ci.id)} className="absolute top-2 left-2 z-10">{isSelected ? <CheckSquare size={16} className="text-cyan-400" /> : <Square size={16} className="text-stone-400" />}</button>}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  {!selectMode && <button onClick={() => toggleSelect(ci.id)} className="p-1.5 text-stone-400 hover:text-cyan-400 bg-stone-900 rounded"><CheckSquare size={12} /></button>}
                  <button onClick={() => duplicateItem(ci)} className="p-1.5 text-stone-400 hover:text-emerald-400 bg-stone-900 rounded"><Copy size={12} /></button>
                  <button onClick={() => startEdit(ci)} className="p-1.5 text-stone-400 hover:text-cyan-400 bg-stone-900 rounded"><Edit2 size={12} /></button>
                  <button onClick={() => removeCatalogItem(providerId, ci.id)} className="p-1.5 text-stone-400 hover:text-rose-400 bg-stone-900 rounded"><X size={12} /></button>
                </div>
                <div className="flex items-start gap-3"><div className={`p-2 rounded-lg shrink-0 ${CATEGORY_COLORS[ci.category] ?? 'text-stone-400 bg-stone-800'}`}><Package size={16} /></div>
                  <div className="flex-1 min-w-0"><h4 className="font-medium text-stone-200 text-sm truncate">{ci.name}</h4><span className={`inline-block px-1.5 py-0.5 rounded text-xs mt-0.5 ${CATEGORY_COLORS[ci.category] ?? ''}`}>{CATEGORY_LABELS[ci.category]}</span></div></div>
                <div className="flex items-center justify-between"><div className="text-emerald-400 font-semibold text-sm flex items-center gap-1"><DollarSign size={12} />{ci.unitPrice.toFixed(2)}</div><div className="text-xs text-stone-400">per {ci.unit}</div></div>
                {ph && <button onClick={() => setShowPriceHistory(showPriceHistory === ci.id ? null : ci.id)} className="flex items-center gap-1 text-xs text-stone-400 hover:text-cyan-400 transition-colors"><TrendingUp size={12} /><span className={ph.trend.direction === 'up' ? 'text-rose-400' : ph.trend.direction === 'down' ? 'text-emerald-400' : ''}>{ph.trend.direction === 'up' ? '+' : ''}{ph.trend.pct}% 6mo</span></button>}
                {showPriceHistory === ci.id && ph && (
                  <div className="bg-stone-900 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-stone-400 mb-1"><span>Price History</span><span className={`font-medium ${ph.trend.direction === 'up' ? 'text-rose-400' : ph.trend.direction === 'down' ? 'text-emerald-400' : ''}`}>{ph.trend.direction === 'up' ? '▲' : ph.trend.direction === 'down' ? '▼' : '◆'} {Math.abs(ph.trend.pct)}%</span></div>
                    {ph.history.map((h, hi) => (
                      <div key={hi} className="flex items-center gap-2 text-xs">
                        <span className="text-stone-400 w-14">{h.date}</span>
                        <div className="flex-1 h-3 bg-stone-800 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500/50 rounded-full transition-all" style={{ width: `${(h.price / Math.max(...ph.history.map(x => x.price))) * 100}%` }} />
                        </div>
                        <span className="text-stone-300 w-16 text-right">${h.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ci.description && <p className={`text-xs text-stone-400 ${expandedDesc === ci.id ? '' : 'line-clamp-2'}`}>{ci.description}{ci.description.length > 80 && <button onClick={() => setExpandedDesc(expandedDesc === ci.id ? null : ci.id)} className="text-cyan-500 hover:text-cyan-400 ml-1">{expandedDesc === ci.id ? 'less' : 'more'}</button>}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-400"><span className="flex items-center gap-1"><Clock size={12} />{ci.leadTimeDays}d lead time</span><span className="flex items-center gap-1"><Tag size={12} />min {ci.minOrder} {ci.unit}</span>{ci.stockQuantity !== undefined && <span className={`flex items-center gap-1 ${ci.stockQuantity > lowStockThreshold ? 'text-emerald-400' : ci.stockQuantity > 0 ? 'text-amber-400' : 'text-rose-400'}`}>{ci.stockQuantity > 0 ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}{ci.stockQuantity} in stock</span>}</div>
                {ci.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-auto pt-1">{ci.tags.map(t => <span key={t} className="px-1.5 py-0.5 bg-stone-800 rounded text-xs text-stone-400">{t}</span>)}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-stone-950 border border-stone-800 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-900 border-b border-stone-800">
              <tr>
                {selectMode && <th className="p-3 w-10"><button onClick={toggleSelectAll} className="text-stone-400 hover:text-stone-200">{selectedItems.size === filteredItems.length ? <CheckSquare size={14} className="text-cyan-400" /> : <Square size={14} />}</button></th>}
                <th className="p-3 text-left text-stone-400 font-medium">Item</th>
                <th className="p-3 text-left text-stone-400 font-medium">Category</th>
                <th className="p-3 text-right text-stone-400 font-medium">Price</th>
                <th className="p-3 text-center text-stone-400 font-medium">Lead Time</th>
                <th className="p-3 text-center text-stone-400 font-medium">Stock</th>
                <th className="p-3 text-right text-stone-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/50">{filteredItems.map(ci => {
              const isSelected = selectedItems.has(ci.id);
              return (
                <tr key={ci.id} className={`hover:bg-stone-900/50 transition-colors group ${isSelected ? 'bg-cyan-500/5' : ''}`}>
                  {selectMode && <td className="p-3"><button onClick={() => toggleSelect(ci.id)}>{isSelected ? <CheckSquare size={14} className="text-cyan-400" /> : <Square size={14} className="text-stone-400" />}</button></td>}
                  <td className="p-3"><div className="font-medium text-stone-200">{ci.name}</div><div className="text-xs text-stone-400">{ci.subcategory || '—'}</div></td>
                  <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[ci.category]}`}>{CATEGORY_LABELS[ci.category]}</span></td>
                  <td className="p-3 text-right text-stone-200 font-medium">${ci.unitPrice.toFixed(2)}<span className="text-stone-400 text-xs">/{ci.unit}</span></td>
                  <td className="p-3 text-center text-stone-400">{ci.leadTimeDays}d</td>
                  <td className="p-3 text-center">{ci.stockQuantity !== undefined ? <span className={`text-xs ${ci.stockQuantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{ci.stockQuantity > 0 ? `${ci.stockQuantity}` : 'Out of stock'}</span> : <span className="text-xs text-stone-400">—</span>}</td>
                  <td className="p-3 text-right"><div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => duplicateItem(ci)} className="p-1 text-stone-400 hover:text-emerald-400"><Copy size={14} /></button>
                    <button onClick={() => startEdit(ci)} className="p-1 text-stone-400 hover:text-cyan-400"><Edit2 size={14} /></button>
                    <button onClick={() => removeCatalogItem(providerId, ci.id)} className="p-1 text-stone-400 hover:text-rose-400"><X size={14} /></button>
                  </div></td>
                </tr>
              );
            })}</tbody></table>
        </div>
      )}
    </div>
  );
}
