import { useState } from 'react';
import { AiEngine, ParseResult, parseWithEngine } from '@/lib/ai/ai-provider';

const ENGINES: { id: AiEngine; label: string }[] = [
  { id: 'local-rules', label: 'Rules (instant)' },
  { id: 'webllm', label: 'Local LLM (WebGPU)' },
];

interface AiBriefPanelProps {
  onParsed?: (result: ParseResult) => void;
}

export function AiBriefPanel({ onParsed }: AiBriefPanelProps) {
  const [briefText, setBriefText] = useState('');
  const [aiEngine, setAiEngine] = useState<AiEngine>('local-rules');
  const [aiStatus, setAiStatus] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!briefText.trim()) return;
    setAiStatus('Parsing…');
    try {
      const result = await parseWithEngine(briefText, aiEngine);
      setAiStatus(result.fellBack
        ? `⚠ Rules fallback (${result.fallbackReason})`
        : `✅ Parsed via ${aiEngine === 'local-rules' ? 'rules' : 'WebLLM'}`);
      onParsed?.(result);
    } catch (err) {
      setAiStatus(`❌ ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="rounded-lg border border-stone-700/60 bg-stone-900/80 p-4">
      <h3 className="font-semibold text-stone-100">Enterprise AI — Brief to Design</h3>
      <p className="mb-3 text-xs text-stone-400">Local &amp; offline · no paid API</p>

      <label className="mb-1 block text-xs font-medium text-stone-400">AI engine</label>
      <div className="mb-3 flex gap-2">
        {ENGINES.map((e) => (
          <button
            key={e.id}
            onClick={() => setAiEngine(e.id)}
            className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
              aiEngine === e.id
                ? 'bg-cyan-600 text-white'
                : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <label className="mb-1 block text-xs font-medium text-stone-400">Design brief (natural language)</label>
      <textarea
        rows={3}
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder="e.g. 3 bedroom house with 2 bathrooms, open plan, 120 m², single storey"
        className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200 placeholder-stone-500 focus:border-cyan-600 focus:outline-none"
      />
      <div className="mt-3">
        <button
          onClick={handleGenerate}
          className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-500"
        >
          Generate Design →
        </button>
      </div>

      {aiStatus && (
        <p className={`mt-2 text-xs ${aiStatus.includes('⚠') ? 'text-amber-400' : aiStatus.includes('❌') ? 'text-red-400' : 'text-emerald-400'}`}>
          {aiStatus}
        </p>
      )}

      {aiEngine === 'webllm' && (
        <p className="mt-2 text-xs text-amber-400">
          ⚠ The local LLM runs fully in your browser (free, no API) but needs <b>WebGPU</b> and
          downloads a ~1&nbsp;GB model on first use. If unavailable it automatically falls back to
          the rules parser — generation never breaks.
        </p>
      )}

      <p className="mt-2 text-xs text-stone-500">
        Extracts building type, bedrooms, bathrooms, floors, area &amp; features, then the
        parametric engine builds the 2D plan → BIM → BOQ.
      </p>
    </div>
  );
}
