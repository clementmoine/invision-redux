import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Routes, Route, Outlet, Link } from 'react-router-dom';

import Test from '@/views/Test';
import { Screen } from '@/views/Screen';
import { Project } from '@/views/Project';
import { Projects } from '@/views/Projects';
import { NotFound } from '@/views/NotFound';

import { About } from '@/components/About';
import { Redirect } from '@/components/Redirect';
import { ThemeToggle } from '@/components/ThemeToggle';

import InVision from '@/assets/invision.svg?react';
import { Toaster } from './components/ui/toaster';

dayjs.extend(relativeTime);

export default function App() {
  return (
    <Routes>
      {/* Screens without layout */}
      <Route path="/test" element={<Test />} />
      {/* Screens without layout */}
      <Route
        path="/projects/:projectId/:screenId/:mode?"
        element={<Screen />}
      />

      {/* Screens with layout */}
      <Route path="/" element={<Layout />}>
        {/* Home => Redirect to projects */}
        <Route path="/" element={<Redirect to="/projects" />} />

        {/* Screens */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/:id" element={<Project />} />

        {/* Not found route */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function Layout() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden">
      <header className="dark z-30 top-0 left-0 w-full flex h-16 border-b bg-background px-4 flex-shrink-0">
        <div className="flex justify-between w-full gap-4 items-center max-w-7xl mx-auto">
          <nav>
            <Link
              to="/"
              className="flex items-center gap-2 h-16 font-semibold flex-shrink-0 text-foreground"
            >
              <InVision className="h-6 w-auto" title="InVision" />
              <h1>
                <span className="sr-only">InVision </span>Redux
              </h1>
            </Link>
          </nav>

          <div className="flex gap-4 ml-auto">
            <ThemeToggle />
            <About />
          </div>
        </div>
      </header>

      <div className="h-full px-4 py-6 overflow-auto bg-muted/40">
        <Toaster />
        <Outlet />
      </div>
    </div>
  );
}
