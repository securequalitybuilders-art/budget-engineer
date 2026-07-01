export type FeedbackCategory =
  | 'bug'
  | 'cost-accuracy'
  | 'mobile'
  | 'confusing-step'
  | 'missing-building-type'
  | 'export-problem'
  | 'feature-request'
  | 'other';

export const FEEDBACK_CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug report' },
  { value: 'cost-accuracy', label: 'Cost inaccuracy' },
  { value: 'mobile', label: 'Mobile layout issue' },
  { value: 'confusing-step', label: 'Confusing step' },
  { value: 'missing-building-type', label: 'Missing building type' },
  { value: 'export-problem', label: 'Export problem' },
  { value: 'feature-request', label: 'Feature request' },
  { value: 'other', label: 'Other' },
];

const APP_VERSION = 'v0.1.0';
const LIVE_URL = 'https://budget-engineer.vercel.app/';
const REPO_URL = 'https://github.com/securequalitybuilders-art/budget-engineer';
const FEEDBACK_EMAIL = 'securequalitybuilders.art@gmail.com';

export function buildIssueReport(input: {
  category: FeedbackCategory;
  title: string;
  description: string;
  currentUrl?: string;
  appVersion?: string;
  projectName?: string;
  browserInfo?: string;
  stepsToReproduce?: string;
}): string {
  const lines: string[] = [];
  lines.push(`## Issue Report`);
  lines.push('');
  lines.push(`**Category:** ${input.category}`);
  lines.push(`**App version:** ${input.appVersion ?? APP_VERSION}`);
  lines.push(`**Live URL:** ${LIVE_URL}`);
  if (input.currentUrl) lines.push(`**Page:** ${input.currentUrl}`);
  if (input.projectName) lines.push(`**Project:** ${input.projectName}`);
  if (input.browserInfo) lines.push(`**Browser:** ${input.browserInfo}`);
  lines.push('');
  lines.push(`### ${input.title}`);
  lines.push('');
  lines.push(input.description);
  if (input.stepsToReproduce) {
    lines.push('');
    lines.push('### Steps to reproduce');
    lines.push('');
    lines.push(input.stepsToReproduce);
  }
  lines.push('');
  lines.push('---');
  lines.push('> Do not include confidential project data.');
  return lines.join('\n');
}

export function buildGitHubIssueUrl(input: {
  title: string;
  body: string;
  labels?: string[];
}): string {
  const params = new URLSearchParams();
  params.set('title', input.title);
  params.set('body', input.body);
  if (input.labels && input.labels.length > 0) {
    params.set('labels', input.labels.join(','));
  }
  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export function buildMailToUrl(input: {
  category: FeedbackCategory;
  title: string;
  body: string;
}): string {
  const subject = encodeURIComponent(`Budget Engineer Feedback — ${input.category}${input.title ? `: ${input.title}` : ''}`);
  const body = encodeURIComponent(input.body);
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function getBrowserInfo(): string {
  const parts: string[] = [];
  if (navigator.userAgent) parts.push(navigator.userAgent);
  if (navigator.language) parts.push(`lang: ${navigator.language}`);
  if (navigator.platform) parts.push(`platform: ${navigator.platform}`);
  return parts.join(' | ');
}
