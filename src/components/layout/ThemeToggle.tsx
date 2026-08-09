import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useShallow } from 'zustand/react/shallow';
import { useUIStore } from '@/stores/uiStore';
import type { AppTheme } from '@/types';

const themes: { value: AppTheme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'system', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore(useShallow(s => ({ theme: s.theme, setTheme: s.setTheme })));

  return (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] p-1">
      {themes.map((t) => {
        const isActive = theme === t.value;
        const TIcon = t.icon;
        return (
          <button
            key={t.value}
            onClick={() => setTheme(t.value)}
            aria-label={`Switch to ${t.label} mode`}
            className={
              'flex h-9 w-9 items-center justify-center rounded-md transition-colors ' +
              (isActive
                ? 'bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]')
            }
          >
            <TIcon size={14} />
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggleSimple() {
  const { setTheme, resolvedTheme } = useUIStore(useShallow(s => ({ setTheme: s.setTheme, resolvedTheme: s.resolvedTheme })));
  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </Button>
  );
}
