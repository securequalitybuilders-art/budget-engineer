import { describe, it, expect } from 'vitest';
import {
  buildIssueReport,
  buildGitHubIssueUrl,
  buildMailToUrl,
  FEEDBACK_CATEGORIES,
} from '@/lib/feedback/feedback-utils';

describe('buildIssueReport', () => {
  it('includes category, title, version, live URL, and privacy note', () => {
    const report = buildIssueReport({
      category: 'bug',
      title: 'Test issue',
      description: 'Something broke',
    });
    expect(report).toContain('**Category:** bug');
    expect(report).toContain('### Test issue');
    expect(report).toContain('Something broke');
    expect(report).toContain('v0.1.0');
    expect(report).toContain('budget-engineer.vercel.app');
    expect(report).toContain('Do not include confidential project data');
  });

  it('includes optional fields when provided', () => {
    const report = buildIssueReport({
      category: 'feature-request',
      title: 'Add XYZ',
      description: 'Would be great',
      currentUrl: '/portfolio',
      projectName: 'Test Project',
      browserInfo: 'Chrome 120',
      stepsToReproduce: '1. Open...',
    });
    expect(report).toContain('**Page:** /portfolio');
    expect(report).toContain('**Project:** Test Project');
    expect(report).toContain('**Browser:** Chrome 120');
    expect(report).toContain('### Steps to reproduce');
    expect(report).toContain('1. Open...');
  });

  it('does not crash when optional fields are missing', () => {
    const report = buildIssueReport({
      category: 'other',
      title: 'Minimal',
      description: 'Just a note',
    });
    expect(report).toContain('**Category:** other');
    expect(report).not.toContain('undefined');
  });

  it('accepts all category types', () => {
    for (const cat of FEEDBACK_CATEGORIES) {
      const report = buildIssueReport({
        category: cat.value,
        title: cat.label,
        description: 'Test',
      });
      expect(report).toContain(`**Category:** ${cat.value}`);
    }
  });
});

describe('buildGitHubIssueUrl', () => {
  it('returns a valid URL pointing to the correct repo', () => {
    const url = buildGitHubIssueUrl({ title: 'Bug', body: 'Details' });
    expect(url).toContain('github.com/securequalitybuilders-art/budget-engineer/issues/new');
    expect(url).toContain(encodeURIComponent('Bug'));
    expect(url).toContain(encodeURIComponent('Details'));
  });

  it('includes labels when provided', () => {
    const url = buildGitHubIssueUrl({ title: 'Test', body: 'Body', labels: ['bug', 'mobile'] });
    expect(url).toContain('labels=');
    expect(url).toContain(encodeURIComponent('bug,mobile'));
  });

  it('works without labels', () => {
    const url = buildGitHubIssueUrl({ title: 'Test', body: 'Body' });
    expect(url).not.toContain('labels=');
  });

  it('encodes special characters safely', () => {
    const url = buildGitHubIssueUrl({ title: 'Bug & Fix "urgent"', body: 'Line 1\nLine 2' });
    expect(url).toContain('title=');
    expect(url).toContain('body=');
    expect(url).not.toContain('undefined');
    expect(url).not.toContain('[object Object]');
  });
});

describe('buildMailToUrl', () => {
  it('returns a mailto URL with subject and body', () => {
    const url = buildMailToUrl({ category: 'bug', title: 'Crash', body: 'It crashes' });
    expect(url).toContain('mailto:');
    expect(url).toContain('securequalitybuilders.art@gmail.com');
    expect(url).toContain('subject=');
    expect(url).toContain(encodeURIComponent('Budget Engineer Feedback — bug: Crash'));
    expect(url).toContain('body=');
    expect(url).toContain(encodeURIComponent('It crashes'));
  });

  it('handles empty title gracefully', () => {
    const url = buildMailToUrl({ category: 'feature-request', title: '', body: 'Body' });
    expect(url).toContain('feature-request');
    expect(url).toContain('subject=');
  });
});
