import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { PilotFeedbackPanel } from '@/components/pilot/PilotFeedbackPanel';
import { PilotReviewSummaryPanel } from '@/components/pilot/PilotReviewSummaryPanel';
import { PilotTrendPanel } from '@/components/pilot/PilotTrendPanel';
import { SelfAssessmentPanel } from '@/components/selfAssessment/SelfAssessmentPanel';
import { usePilotFeedbackStore } from '@/stores/pilotFeedbackStore';
import { useSelfAssessmentStore } from '@/stores/selfAssessmentStore';
import { downloadPilotIssueLog, downloadPilotSummaryReport, downloadOpenBlockerReport, downloadCloseoutRecommendation } from '@/lib/pilot/pilotExport';
import { downloadSelfAssessmentReport } from '@/lib/selfAssessment/selfAssessmentReport';
import { ArrowLeft, ClipboardList, BarChart3, TrendingUp, FileText, Link as LinkIcon, Download } from 'lucide-react';

type Tab = 'feedback' | 'summary' | 'trends' | 'self-assessment';

export function PilotReviewPage() {
  const navigate = useNavigate();
  const store = usePilotFeedbackStore();
  const saStore = useSelfAssessmentStore();
  const [tab, setTab] = useState<Tab>('feedback');

  const activeSession = store.getActiveSession();
  const observations = store.getActiveObservations();
  const latestAssessment = saStore.getLatestAssessment();

  const linkedAssessment = activeSession
    ? saStore.getAssessmentsForSession(activeSession.id)[0] ?? null
    : null;

  const handleExportAll = useCallback(() => {
    if (!activeSession) return;
    downloadPilotIssueLog(activeSession, observations);
    downloadPilotSummaryReport(activeSession, observations);
    downloadOpenBlockerReport(observations);
    downloadCloseoutRecommendation(activeSession, observations);
  }, [activeSession, observations]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] mb-2">
          <ArrowLeft size={12} /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Pilot Review</h1>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Structured observation capture, issue tracking, closeout review, and self-assessment
            </p>
          </div>
          {activeSession && tab !== 'trends' && tab !== 'self-assessment' && (
            <button onClick={handleExportAll}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[9px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">
              Export All Reports
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border-default)] mb-4">
        <button onClick={() => setTab('feedback')}
          className={'flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium rounded-t transition-colors ' + (tab === 'feedback' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')}>
          <ClipboardList size={12} />
          Feedback & Issues
        </button>
        <button onClick={() => setTab('summary')}
          className={'flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium rounded-t transition-colors ' + (tab === 'summary' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')}>
          <BarChart3 size={12} />
          Review Summary
        </button>
        <button onClick={() => setTab('trends')}
          className={'flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium rounded-t transition-colors ' + (tab === 'trends' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')}>
          <TrendingUp size={12} />
          Trends & Comparison
        </button>
        <button onClick={() => setTab('self-assessment')}
          className={'flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium rounded-t transition-colors ' + (tab === 'self-assessment' ? 'border-b-2 border-[var(--brand-accent)] text-[var(--text-primary)] bg-[var(--bg-tertiary)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]')}>
          <FileText size={12} />
          Self-Assessment
        </button>
      </div>

      {/* Content */}
      {tab === 'feedback' ? (
        <PilotFeedbackPanel onExport={handleExportAll} />
      ) : tab === 'summary' ? (
        <PilotReviewSummaryPanel />
      ) : tab === 'trends' ? (
        <PilotTrendPanel />
      ) : (
        <SelfAssessmentPanel linkedSessionId={activeSession?.id ?? null} />
      )}

      {/* Linked assessment card — shown when on a non-assessment tab and a linked assessment exists */}
      {tab !== 'self-assessment' && linkedAssessment && (
        <Card className="mt-4">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <LinkIcon size={12} className="mt-0.5 shrink-0 text-blue-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-blue-400">Linked Self-Assessment</span>
                  <span className={`text-[9px] font-semibold px-1 rounded ${
                    linkedAssessment.result.supervision.recommendedTier === 'blocked' ? 'bg-red-900/50 text-red-400' :
                    linkedAssessment.result.supervision.recommendedTier === 'internal-only' ? 'bg-amber-900/50 text-amber-400' :
                    linkedAssessment.result.supervision.recommendedTier === 'supervised-professional' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {linkedAssessment.result.supervision.tierLabel}
                  </span>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                  {linkedAssessment.name} — {linkedAssessment.result.matchedCases.length} matched reference case(s)
                </p>
                <div className="flex gap-3 mt-1 text-[9px] text-gray-500">
                  <span>Typology: {linkedAssessment.snapshot.typology}</span>
                  <span>Storeys: {linkedAssessment.snapshot.storeyProfile}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => downloadSelfAssessmentReport(linkedAssessment.result)}
                  className="flex items-center gap-1 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-1 px-2 rounded transition-colors"
                >
                  <Download size={10} />
                  Export
                </button>
                <button
                  onClick={() => setTab('self-assessment')}
                  className="text-[9px] bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-2 rounded transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Latest assessment card — shown when on a non-assessment tab with no linked session but a general assessment exists */}
      {tab !== 'self-assessment' && !linkedAssessment && latestAssessment && (
        <Card className="mt-4">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <FileText size={12} className="mt-0.5 shrink-0 text-gray-400" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-gray-300">Latest Self-Assessment</span>
                  <span className={`text-[9px] font-semibold px-1 rounded ${
                    latestAssessment.result.supervision.recommendedTier === 'blocked' ? 'bg-red-900/50 text-red-400' :
                    latestAssessment.result.supervision.recommendedTier === 'internal-only' ? 'bg-amber-900/50 text-amber-400' :
                    latestAssessment.result.supervision.recommendedTier === 'supervised-professional' ? 'bg-blue-900/50 text-blue-400' :
                    'bg-green-900/50 text-green-400'
                  }`}>
                    {latestAssessment.result.supervision.tierLabel}
                  </span>
                  {!latestAssessment.linkedSessionId && activeSession && (
                    <button
                      onClick={() => saStore.linkToSession(latestAssessment.id, activeSession.id)}
                      className="text-[9px] text-blue-400 hover:text-blue-300 underline"
                    >
                      Link to session
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-gray-400 mt-1">
                  {latestAssessment.name} — {new Date(latestAssessment.createdAt).toLocaleDateString('en-GB')}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => downloadSelfAssessmentReport(latestAssessment.result)}
                  className="flex items-center gap-1 text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-1 px-2 rounded transition-colors"
                >
                  <Download size={10} />
                  Export
                </button>
                <button
                  onClick={() => setTab('self-assessment')}
                  className="text-[9px] bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-1 px-2 rounded transition-colors"
                >
                  View
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Local-first disclaimer */}
      <Card className="mt-6">
        <CardContent className="p-3">
          <div className="flex items-start gap-2 text-[8px] text-[var(--text-muted)]">
            <BarChart3 size={10} className="mt-0.5 shrink-0" />
            <span>
              All data is stored locally in your browser (IndexedDB via Zustand/persist).
              There is no cloud sync, centralized team dashboard, or remote telemetry.
              Export reports manually to share with your team.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
