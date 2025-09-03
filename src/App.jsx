import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AuthProvider from './contexts/AuthContext.jsx';
// removed: import { Toaster } from 'react-hot-toast';
// removed: import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary.jsx';
// removed: import { ErrorBoundary } from 'react-error-boundary';
// removed: import ErrorFallback from './components/ErrorBoundary';
import { useMonitoring } from './hooks/useMonitoring.jsx';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Pages (files in src directory)
import Dashboard from './dashboard.jsx';
import ICD10Browser from './icd10-browser.jsx';
import DrugDatabase from './drug-database.jsx';

// Fallback lightweight placeholders for yet-to-wire pages
const AIMapper = React.lazy(() => import('./ai-mapper.jsx'));
const SearchTools = React.lazy(() => import('./search-tools.jsx'));
const DataManagement = React.lazy(() => import('./data-management.jsx'));

// Layout (renamed to src/Layout.jsx)
import Layout from './Layout.jsx';

// Loading fallback component
const LoadingFallback = ({ children }) => (
  <div className="flex items-center justify-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Re-enable page tracking using existing monitoring hook
const usePageTracking = () => {
  const location = useLocation();
  const { trackPageView } = useMonitoring();

  useEffect(() => {
    const pageName = location.pathname.substring(1).replace(/\//g, '_') || 'dashboard';
    if (typeof trackPageView === 'function') {
      trackPageView(pageName, { path: location.pathname + location.search });
    }
  }, [location, trackPageView]);
};

function PageTracker() {
  usePageTracking();
  return null;
}
function AppRoutes() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/icd10" element={<ICD10Browser />} />
        <Route path="/drugs" element={<DrugDatabase />} />
        <Route 
          path="/ai" 
          element={
            <React.Suspense fallback={<LoadingFallback />}>
              <AIMapper />
            </React.Suspense>
          } 
        />
        <Route 
          path="/search" 
          element={
            <React.Suspense fallback={<LoadingFallback />}>
              <SearchTools />
            </React.Suspense>
          } 
        />
        <Route 
          path="/data" 
          element={
            <React.Suspense fallback={<LoadingFallback />}>
              <DataManagement />
            </React.Suspense>
          } 
        />
      </Routes>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
        <BrowserRouter>
          <PageTracker />
          <Layout>
            <AppRoutes />
          </Layout>
          <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="colored" />
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  )
}
