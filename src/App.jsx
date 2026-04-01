import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AlertProvider } from './context/AlertContext';
import { ThemeProvider } from './components/theme-provider';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import AdminRoute from './components/AdminRoute';
import AdminLayout from './layouts/AdminLayout';
import MatrixLayout from './layouts/MatrixLayout';
import NotFound from './pages/NotFound';

// Lazy load admin pages
const FrameManager = lazy(() => import('./pages/admin/FrameManager'));
const FrameEditor = lazy(() => import('./pages/admin/FrameEditor'));
const FilterManager = lazy(() => import('./pages/admin/FilterManager'));
const ThemeManager = lazy(() => import('./pages/admin/ThemeManager'));
const EventManager = lazy(() => import('./pages/admin/EventManager'));
const DeviceManager = lazy(() => import('./pages/admin/DeviceManager'));
const SubscriptionOverview = lazy(() => import('./pages/admin/SubscriptionOverview'));
const TokenManager = lazy(() => import('./pages/admin/TokenManager'));
const SuperadminDashboard = lazy(() => import('./pages/admin/SuperadminDashboard'));
const StorageManager = lazy(() => import('./pages/admin/StorageManager'));
const PulseMonitor = lazy(() => import('./pages/admin/PulseMonitor'));
const Login = lazy(() => import('./pages/Login'));
const Gallery = lazy(() => import('./pages/Gallery'));

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
    <div className="animate-spin text-primary">
      <svg className="w-8 h-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
    <div className="text-muted-foreground font-medium text-sm">Loading...</div>
  </div>
);

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="pixenze-ui-theme">
      <TooltipProvider>
        <AlertProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Main App Layout (Protected) */}
                  <Route element={
                    <AdminRoute>
                      <AdminLayout />
                    </AdminRoute>
                  }>
                    <Route path="/" element={<FrameManager />} />
                    <Route path="/frames/new" element={<FrameEditor />} />
                    <Route path="/frames/edit/:id" element={<FrameEditor />} />
                    <Route path="/events" element={<EventManager />} />
                    <Route path="/devices" element={<DeviceManager />} />
                    <Route path="/filters" element={<FilterManager />} />
                    <Route path="/theme" element={<ThemeManager />} />
                    <Route path="/subscription" element={<SubscriptionOverview />} />
                    <Route path="/tokens" element={<TokenManager />} />
                  </Route>

                  {/* Matrix Control Center (Superadmin Only) */}
                  <Route path="/matrix" element={
                    <AdminRoute>
                      <MatrixLayout />
                    </AdminRoute>
                  }>
                    <Route index element={<Navigate to="/matrix/dashboard" replace />} />
                    <Route path="dashboard" element={<SuperadminDashboard />} />
                    <Route path="storage" element={<StorageManager />} />
                    <Route path="pulse" element={<PulseMonitor />} />
                  </Route>

                  <Route path="/login" element={<Login />} />
                  <Route path="/gallery/:eventSlug" element={<Gallery />} />

                  {/* 404 Route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </AlertProvider>
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
