import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FEEDBACK_CATEGORIES, buildIssueReport, buildGitHubIssueUrl, buildMailToUrl, copyTextToClipboard, getBrowserInfo } from '@/lib/feedback/feedback-utils';
import type { FeedbackCategory } from '@/lib/feedback/feedback-utils';
import { Bug, Check, Copy, ExternalLink, Mail, X } from 'lucide-react';

type StatusType = 'idle' | 'copied' | 'copy-failed' | 'github-opened' | null;

export function FeedbackPanel({ projectName, currentUrl, compact }: { projectName?: string; currentUrl?: string; compact?: boolean }) {
  const [category, setCategory] = useState<FeedbackCategory>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [steps, setSteps] = useState('');
  const [includeInfo, setIncludeInfo] = useState(true);
  const [status, setStatus] = useState<StatusType>(null);

  const buildReport = useCallback(() => {
    return buildIssueReport({
      category,
      title: title || 'Untitled',
      description: description || 'No description provided.',
      currentUrl: includeInfo ? currentUrl ?? window.location.href : undefined,
      appVersion: 'v0.1.0',
      projectName: includeInfo ? projectName : undefined,
      browserInfo: includeInfo ? getBrowserInfo() : undefined,
      stepsToReproduce: steps || undefined,
    });
  }, [category, title, description, steps, includeInfo, currentUrl, projectName]);

  const handleCopy = async () => {
    const report = buildReport();
    const ok = await copyTextToClipboard(report);
    setStatus(ok ? 'copied' : 'copy-failed');
    setTimeout(() => setStatus(null), 3000);
  };

  const handleGitHub = () => {
    const report = buildReport();
    const url = buildGitHubIssueUrl({
      title: title || 'Untitled',
      body: report,
      labels: [category],
    });
    window.open(url, '_blank', 'noopener,noreferrer');
    setStatus('github-opened');
    setTimeout(() => setStatus(null), 3000);
  };

  const handleEmail = () => {
    const report = buildReport();
    const url = buildMailToUrl({ category, title, body: report });
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClear = () => {
    setCategory('bug');
    setTitle('');
    setDescription('');
    setSteps('');
    setIncludeInfo(true);
    setStatus(null);
  };

  const inner = (
    <div className="space-y-3">
      {/* Category */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-accent)]"
        >
          {FEEDBACK_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief summary of your feedback"
          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]"
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you experienced..."
          rows={compact ? 3 : 4}
          className="w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]"
        />
      </div>

      {/* Steps to reproduce */}
      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Steps to reproduce (optional)</label>
        <textarea
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          placeholder="1. Go to... 2. Click... 3. See..."
          rows={compact ? 2 : 3}
          className="w-full resize-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--brand-accent)]"
        />
      </div>

      {/* Include info checkbox */}
      <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={includeInfo}
          onChange={(e) => setIncludeInfo(e.target.checked)}
          className="mt-0.5"
        />
        Include browser and page information
      </label>

      {/* Status message */}
      {status && (
        <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
          status === 'copied' ? 'bg-emerald-500/10 text-emerald-400' :
          status === 'copy-failed' ? 'bg-red-500/10 text-red-400' :
          'bg-blue-500/10 text-blue-400'
        }`}>
          {status === 'copied' && <><Check size={12} /> Report copied to clipboard</>}
          {status === 'copy-failed' && <><X size={12} /> Failed to copy</>}
          {status === 'github-opened' && <><ExternalLink size={12} /> GitHub issue page opened</>}
        </div>
      )}

      {/* Action buttons */}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : ''}`}>
        <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5">
          <Copy size={14} />
          Copy report
        </Button>
        <Button variant="secondary" size="sm" onClick={handleGitHub} className="gap-1.5">
          <Bug size={14} />
          GitHub issue
        </Button>
        <Button variant="secondary" size="sm" onClick={handleEmail} className="gap-1.5">
          <Mail size={14} />
          Email
        </Button>
        {(title || description) && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1.5">
            <X size={14} />
            Clear
          </Button>
        )}
      </div>

      {/* Privacy note */}
      <p className="text-[10px] text-[var(--text-muted)]">
        Feedback is not sent automatically. You choose whether to copy, open a GitHub issue, or send an email.
        Do not include confidential project data.
      </p>
    </div>
  );

  if (compact) return inner;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Bug size={18} className="text-[var(--brand-accent)]" />
          <CardTitle className="text-base">Send Feedback</CardTitle>
        </div>
        <CardDescription>Report bugs, suggest features, or share issues</CardDescription>
      </CardHeader>
      <CardContent>
        {inner}
      </CardContent>
    </Card>
  );
}
