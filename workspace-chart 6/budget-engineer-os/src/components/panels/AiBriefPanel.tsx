import { useAppStore } from '../../store/appStore';
import { AiEngine } from '../../ai/aiProvider';

const ENGINES: { id: AiEngine; label: string }[] = [
  { id: 'local-rules', label: 'Rules (instant)' },
  { id: 'webllm', label: 'Local LLM (WebGPU)' },
];

export function AiBriefPanel() {
  const briefText = useAppStore((s) => s.briefText);
  const setBriefText = useAppStore((s) => s.setBriefText);
  const generate = useAppStore((s) => s.generateFromBrief);
  const aiEngine = useAppStore((s) => s.aiEngine);
  const setAiEngine = useAppStore((s) => s.setAiEngine);
  const aiStatus = useAppStore((s) => s.aiStatus);

  return (
    <div className="panel">
      <h3>Enterprise AI — Brief to Design</h3>
      <p className="sub">Local &amp; offline · no paid API</p>

      <label className="field">AI engine</label>
      <div className="btn-row" style={{ marginBottom: 10 }}>
        {ENGINES.map((e) => (
          <button key={e.id} className={aiEngine === e.id ? 'active' : ''} onClick={() => setAiEngine(e.id)}>
            {e.label}
          </button>
        ))}
      </div>

      <label className="field">Design brief (natural language)</label>
      <textarea
        rows={3}
        value={briefText}
        onChange={(e) => setBriefText(e.target.value)}
        placeholder="e.g. 3 bedroom house with 2 bathrooms, open plan, 120 m², single storey"
      />
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => void generate()}>Generate Design →</button>
      </div>

      {aiStatus && (
        <p className="note" style={{ marginTop: 10, color: aiStatus.includes('unavailable') ? '#f59e0b' : '#22c55e' }}>
          {aiStatus}
        </p>
      )}

      {aiEngine === 'webllm' && (
        <p className="note" style={{ marginTop: 8, color: '#f59e0b' }}>
          ⚠ The local LLM runs fully in your browser (free, no API) but needs <b>WebGPU</b> and
          downloads a ~1&nbsp;GB model on first use. If unavailable it automatically falls back to
          the rules parser — generation never breaks.
        </p>
      )}

      <p className="note" style={{ marginTop: 8 }}>
        Extracts building type, bedrooms, bathrooms, floors, area &amp; features, then the
        parametric engine builds the 2D plan → BIM → BOQ.
      </p>
    </div>
  );
}
