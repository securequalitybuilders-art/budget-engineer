import { Suspense, lazy } from 'react';
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

function GlobalLayout() {
  useKeyboardShortcuts();

  return (
    <>
      <CommandBar />
      <Outlet />
      <CommandPalette />
      <ShortcutsHelp />
    </>
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
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
