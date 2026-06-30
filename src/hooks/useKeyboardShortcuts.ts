import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';

const isTypingTarget = (e: KeyboardEvent) => {
  const target = e.target as HTMLElement;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
};

/**
 * Global keyboard shortcuts for Budget Engineer Studio.
 * Does not fire when typing in inputs/textareas or when command palette is open.
 */
export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { setTheme, resolvedTheme, toggleSidebar, toggleAiChat, toggleBoqPanel, toggleShortcutsHelp, setActiveStage } = useUIStore();
  const { currentProjectId } = useProjectStore();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e)) return;
      if (e.metaKey || e.ctrlKey) return; // Let command palette handle Cmd+K

      const isDark = resolvedTheme === 'dark';
      const key = e.key.toLowerCase();

      switch (key) {
        case '?':
          e.preventDefault();
          toggleShortcutsHelp();
          break;
        case 't':
          e.preventDefault();
          setTheme(isDark ? 'light' : 'dark');
          break;
        case 'b':
          e.preventDefault();
          toggleSidebar();
          break;
        case 'c':
          e.preventDefault();
          toggleAiChat();
          break;
        case 'q':
          e.preventDefault();
          toggleBoqPanel();
          break;
        case 'n':
          e.preventDefault();
          navigate('/new');
          break;
        case 'h':
          e.preventDefault();
          navigate('/');
          break;
        case 'p':
          if (currentProjectId) {
            e.preventDefault();
            navigate(`/project/${currentProjectId}`);
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
          if (currentProjectId) {
            e.preventDefault();
            setActiveStage(parseInt(key, 10));
          }
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    navigate,
    resolvedTheme,
    setTheme,
    toggleSidebar,
    toggleAiChat,
    toggleBoqPanel,
    toggleShortcutsHelp,
    setActiveStage,
    currentProjectId,
  ]);
}
