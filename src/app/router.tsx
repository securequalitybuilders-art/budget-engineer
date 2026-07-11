import { Suspense, lazy, useEffect } from 'react';
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

function SafeRoute({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary><Suspense fallback={<PageLoader />}>{children}</Suspense></ErrorBoundary>;
}

function GlobalLayout() {
  useKeyboardShortcuts();

  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]')
    if (link) link.setAttribute('href', window.location.href)
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
