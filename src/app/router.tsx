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
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const Home = lazy(() => import('@/pages/Home').then((m) => ({ default: m.Home })));
const ProjectWizard = lazy(() => import('@/pages/ProjectWizard').then((m) => ({ default: m.ProjectWizard })));
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage').then((m) => ({ default: m.FeedbackPage })));

function GlobalLayout() {
  useKeyboardShortcuts();

  useEffect(() => {
    const link = document.querySelector('link[rel="canonical"]')
    if (link) link.setAttribute('href', window.location.href)
  }, [])

  return (
    <main>
      <CommandBar />
      <Outlet />
      <CommandPalette />
      <ShortcutsHelp />
    </main>
  );
}

const router = createBrowserRouter([
  {
    element: <GlobalLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: '/new',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProjectWizard />
          </Suspense>
        ),
      },
      {
        path: '/project/:id',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: '/portfolio',
        element: (
          <Suspense fallback={<PageLoader />}>
            <PortfolioPage />
          </Suspense>
        ),
      },
      {
        path: '/feedback',
        element: (
          <Suspense fallback={<PageLoader />}>
            <FeedbackPage />
          </Suspense>
        ),
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
