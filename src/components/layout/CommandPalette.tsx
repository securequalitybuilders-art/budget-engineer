import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  Home,
  Plus,
  Moon,
  Sun,
  PanelLeft,
  MessageSquare,
  Table,
  HelpCircle,
  ArrowRight,
  Command,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  shortcut?: string;
  icon: typeof Home;
  action: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setTheme, resolvedTheme, toggleSidebar, toggleAiChat, toggleBoqPanel, toggleShortcutsHelp } = useUIStore();
  const { currentProjectId } = useProjectStore();

  const commands = useMemo<CommandItem[]>(() => {
    const isDark = resolvedTheme === 'dark';
    return [
      {
        id: 'home',
        label: 'Go to Home',
        shortcut: 'G H',
        icon: Home,
        action: () => navigate('/'),
      },
      {
        id: 'new',
        label: 'New Project',
        shortcut: 'G N',
        icon: Plus,
        action: () => navigate('/new'),
      },
      ...(currentProjectId
        ? [
            {
              id: 'project',
              label: 'Open Current Project',
              shortcut: 'G P',
              icon: Command,
              action: () => navigate(`/project/${currentProjectId}`),
            },
          ]
        : []),
      {
        id: 'theme',
        label: `Switch to ${isDark ? 'Light' : 'Dark'} Mode`,
        shortcut: 'T',
        icon: isDark ? Sun : Moon,
        action: () => setTheme(isDark ? 'light' : 'dark'),
      },
      {
        id: 'sidebar',
        label: 'Toggle Sidebar',
        shortcut: 'B',
        icon: PanelLeft,
        action: () => toggleSidebar(),
      },
      {
        id: 'ai',
        label: 'Toggle AI Assistant',
        shortcut: 'C',
        icon: MessageSquare,
        action: () => toggleAiChat(),
      },
      {
        id: 'boq',
        label: 'Toggle BOQ Panel',
        shortcut: 'Q',
        icon: Table,
        action: () => toggleBoqPanel(),
      },
      {
        id: 'help',
        label: 'Keyboard Shortcuts',
        shortcut: '?',
        icon: HelpCircle,
        action: () => toggleShortcutsHelp(),
      },
    ];
  }, [navigate, resolvedTheme, setTheme, toggleSidebar, toggleAiChat, toggleBoqPanel, toggleShortcutsHelp, currentProjectId]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        (c.shortcut?.toLowerCase().replace(' ', '').includes(q) ?? false)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      if ((isMod && e.key.toLowerCase() === 'k') || (e.key === '/' && !open)) {
        e.preventDefault();
        setOpen((prev) => {
          if (prev) {
            prevFocusRef.current?.focus();
            prevFocusRef.current = null;
          } else {
            prevFocusRef.current = document.activeElement as HTMLElement;
          }
          return !prev;
        });
      }

      if (e.key === 'Escape') {
        setOpen(false);
        prevFocusRef.current?.focus();
        prevFocusRef.current = null;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    } else if (prevFocusRef.current) {
      prevFocusRef.current.focus();
      prevFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !dialogRef.current) return;
    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleTabTrap);
    return () => window.removeEventListener('keydown', handleTabTrap);
  }, [open]);

  const run = (cmd: CommandItem) => {
    cmd.action();
    setOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filtered[selectedIndex];
      if (cmd) run(cmd);
    }
  };

  if (!open) return null;

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[15vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Command palette">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[var(--border-default)] px-4 py-3">
          <Command size={18} className="text-[var(--text-muted)]" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            aria-label="Search commands"
            className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          <kbd className="rounded bg-[var(--bg-tertiary)] px-2 py-1 text-xs text-[var(--text-muted)]">Esc</kbd>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              No commands found.
            </p>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const selected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => run(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selected
                      ? 'bg-[var(--brand-primary)] text-white'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    <span>{cmd.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {cmd.shortcut && (
                      <span className={cn('text-xs', selected ? 'text-white/70' : 'text-[var(--text-muted)]')}>
                        {cmd.shortcut}
                      </span>
                    )}
                    <ArrowRight size={14} className={selected ? 'opacity-100' : 'opacity-0'} />
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-default)] px-4 py-2 text-xs text-[var(--text-muted)]">
          <span>Cmd / Ctrl + K to open</span>
          <span>↑↓ navigate · Enter run</span>
        </div>
      </div>
    </div>
  );
}
