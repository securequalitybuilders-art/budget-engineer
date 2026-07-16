import { Suspense, lazy, useEffect, useState } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { CommandBar } from '@/components/layout/CommandBar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ShortcutsHelp } from '@/components/layout/ShortcutsHelp';
import { PageLoader } from '@/components/layout/PageLoader';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DiagnosticsPanel } from '@/components/common/DiagnosticsPanel';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const ProjectWizard = lazy(() => import('@/pages/ProjectWizard').then((m) => ({ default: m.ProjectWizard })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage').then((m) => ({ default: m.FeedbackPage })));
const PresentationStudio = lazy(() => import('@/pages/studio/PresentationStudio'));
const InteriorStudio = lazy(() => import('@/pages/studio/InteriorStudio').then((m) => ({ default: m.InteriorStudio })));
const AcademyHome = lazy(() => import('@/pages/Academy').then((m) => ({ default: m.AcademyHome })));
const AcademyLesson = lazy(() => import('@/pages/Academy').then((m) => ({ default: m.AcademyLesson })));
const SiteAnalysis = lazy(() => import('@/pages/SiteAnalysis'));
const SiteAnalysisStudio = lazy(() => import('@/pages/studio/SiteAnalysisStudio').then((m) => ({ default: m.SiteAnalysisStudio })));
const AssuranceStudio = lazy(() => import('@/pages/studio/AssuranceStudio').then((m) => ({ default: m.AssuranceStudio })));
const DeliveryStudio = lazy(() => import('@/pages/studio/DeliveryStudio').then((m) => ({ default: m.DeliveryStudio })));
const HandoverStudio = lazy(() => import('@/pages/studio/HandoverStudio').then((m) => ({ default: m.HandoverStudio })));
const ProcurementStudio = lazy(() => import('@/pages/studio/ProcurementStudio').then((m) => ({ default: m.ProcurementStudio })));
const ProjectControlsStudio = lazy(() => import('@/pages/studio/ProjectControlsStudio').then((m) => ({ default: m.ProjectControlsStudio })));

function SafeRoute({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary><Suspense fallback={<PageLoader />}>{children}</Suspense></ErrorBoundary>;
}

function GlobalLayout() {
  useKeyboardShortcuts();
  const [diagOpen, setDiagOpen] = useState(false);

  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]')
    if (link) link.setAttribute('href', window.location.href)
  }, [])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault()
        setDiagOpen((o) => !o)
      }
    }
    function handleToggle() { setDiagOpen((o) => !o) }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('toggle-diagnostics', handleToggle)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('toggle-diagnostics', handleToggle)
    }
  }, [])

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-[var(--brand-primary)] focus:px-4 focus:py-2 focus:text-sm focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)]">
        Skip to main content
      </a>
      <main id="main-content">
        <CommandBar />
        <Outlet />
        <CommandPalette />
        <ShortcutsHelp />
        {diagOpen && <DiagnosticsPanel onClose={() => setDiagOpen(false)} />}
      </main>
    </>
  );
}

const router = createBrowserRouter([
  {
    element: <GlobalLayout />,
    children: [
      {
        path: '/',
        element: <SafeRoute><Home /></SafeRoute>,
      },
      {
        path: '/new',
        element: <SafeRoute><ProjectWizard /></SafeRoute>,
      },
      {
        path: '/project/:id',
        element: <SafeRoute><Dashboard /></SafeRoute>,
      },
      {
        path: '/portfolio',
        element: <SafeRoute><PortfolioPage /></SafeRoute>,
      },
      {
        path: '/feedback',
        element: <SafeRoute><FeedbackPage /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/interior',
        element: <SafeRoute><InteriorStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/presentation',
        element: <SafeRoute><PresentationStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/site-analysis',
        element: <SafeRoute><SiteAnalysisStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/assurance',
        element: <SafeRoute><AssuranceStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/delivery',
        element: <SafeRoute><DeliveryStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/handover',
        element: <SafeRoute><HandoverStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/procurement',
        element: <SafeRoute><ProcurementStudio /></SafeRoute>,
      },
      {
        path: '/project/:id/studio/project-controls',
        element: <SafeRoute><ProjectControlsStudio /></SafeRoute>,
      },
      {
        path: '/site-analysis',
        element: <SafeRoute><SiteAnalysis /></SafeRoute>,
      },
      {
        path: '/academy',
        element: <SafeRoute><AcademyHome /></SafeRoute>,
      },
      {
        path: '/academy/:skillPath/:lessonId',
        element: <SafeRoute><AcademyLesson /></SafeRoute>,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
