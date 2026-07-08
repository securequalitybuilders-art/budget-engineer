import { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import { BimRoute } from './routes/BimRoute';

export function App() {
  const ready = useAppStore((s) => s.ready);
  const initialize = useAppStore((s) => s.initialize);

  useEffect(() => { void initialize(); }, [initialize]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">DZ</div>
          <div>
            <h1>Budget Engineer Studio</h1>
            <p>Computational Design OS — Construction Affordable for Everyone</p>
          </div>
        </div>
        <nav className="nav-pills">
          <span className="pill">Design Journey</span>
          <span className="pill">Enterprise AI</span>
          <span className="pill active">3D BIM</span>
          <span className="pill">Quantities</span>
          <span className="pill">BOQ</span>
        </nav>
      </header>
      {ready ? <BimRoute /> : <p className="note">Initializing offline workspace…</p>}
    </div>
  );
}
