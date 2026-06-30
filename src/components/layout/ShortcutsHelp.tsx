import { useUIStore } from '@/stores/uiStore';
import { Button } from '@/components/ui/Button';
import { X, Keyboard } from 'lucide-react';

const shortcuts = [
  { keys: 'Cmd / Ctrl + K', action: 'Open command palette' },
  { keys: 'Esc', action: 'Close palette / panels' },
  { keys: 'T', action: 'Toggle light / dark theme' },
  { keys: 'B', action: 'Toggle sidebar' },
  { keys: 'C', action: 'Toggle AI chat' },
  { keys: 'Q', action: 'Toggle BOQ panel' },
  { keys: '1 — 6', action: 'Set design journey stage' },
  { keys: 'H', action: 'Go home' },
  { keys: 'N', action: 'New project' },
  { keys: 'P', action: 'Open current project' },
  { keys: '?', action: 'Show this help' },
];

export function ShortcutsHelp() {
  const { shortcutsOpen, toggleShortcutsHelp } = useUIStore();

  if (!shortcutsOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-[var(--brand-accent)]" />
            <h2 className="font-display font-semibold">Keyboard Shortcuts</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleShortcutsHelp} aria-label="Close help">
            <X size={18} />
          </Button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          <div className="grid gap-2">
            {shortcuts.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between rounded-lg bg-[var(--bg-tertiary)] px-3 py-2 text-sm"
              >
                <span className="text-[var(--text-primary)]">{s.action}</span>
                <kbd className="rounded bg-[var(--bg-secondary)] px-2 py-1 text-xs font-mono text-[var(--brand-accent)]">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[var(--border-default)] px-4 py-3 text-center text-xs text-[var(--text-muted)]">
          Shortcuts are disabled while typing in inputs or textareas.
        </div>
      </div>
    </div>
  );
}
