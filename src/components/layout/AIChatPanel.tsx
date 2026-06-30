import { useState } from 'react';
import { useUIStore } from '@/stores/uiStore';
import { useProjectStore } from '@/stores/projectStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Send, Sparkles, X, Bot, User, Loader2, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

export function AIChatPanel() {
  const { aiChatOpen, toggleAiChat } = useUIStore();
  const { currentProject, currentBrief, generateDesigns } = useProjectStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'ai',
      content:
        'I am your local Budget Assistant. I run offline-first and turn your brief into a structured design, then into CAD, BIM, and BOQ.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    // Local deterministic response explaining the pipeline
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content:
            'I parse your brief into building type, rooms, dimensions, and budget using a local deterministic AI engine. Then I generate 3 design options (compact, standard, spacious) with quantities for a BOQ.',
        },
      ]);
    }, 800);
  };

  const handleGenerateFromBrief = async () => {
    if (!currentProject || !currentBrief) return;
    setIsGenerating(true);
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'ai', content: 'Parsing your brief and generating 3 design options…' },
    ]);
    try {
      await generateDesigns(currentProject.id);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: 'Done! 3 design options were generated from the brief and saved locally. Open the Properties panel to review them.',
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: `Could not generate designs: ${err instanceof Error ? err.message : 'unknown error'}`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!aiChatOpen) {
    return (
      <button
        onClick={toggleAiChat}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[var(--brand-primary-dark)] shadow-lg shadow-[var(--brand-accent)]/30 transition-transform hover:scale-105"
        aria-label="Open AI assistant"
      >
        <Sparkles size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[60vh] w-96 flex-col rounded-t-2xl glass shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]">
            <Sparkles size={16} />
          </div>
          <span className="font-display font-semibold">Budget Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleAiChat} aria-label="Close AI chat">
          <X size={18} />
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'flex gap-2',
              msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                msg.role === 'user' ? 'bg-[var(--bg-tertiary)]' : 'bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]'
              )}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                msg.role === 'user'
                  ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  : 'border border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-[var(--border-default)] p-3">
        {currentProject && currentBrief && (
          <Button
            variant="brand"
            size="sm"
            className="mb-2 w-full gap-2"
            onClick={handleGenerateFromBrief}
            disabled={isGenerating}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            Generate 3 design options from current brief
          </Button>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Ask me to design, cost, or export..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" aria-label="Send message">
            <Send size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
}
