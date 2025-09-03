import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ErrorBoundary, { RouteErrorBoundary, AsyncErrorBoundary } from './components/ErrorBoundary.jsx'
import { usePageTracking } from './hooks/useMonitoring.js'

// Pages (files in src directory)
import Dashboard from './dashboard.jsx'
import ICD10Browser from './icd10-browser.jsx'
import DrugDatabase from './drug-database.jsx'

// Fallback lightweight placeholders for yet-to-wire pages
const AIMapper = React.lazy(() => import('./ai-mapper.jsx'))
const SearchTools = React.lazy(() => import('./search-tools.jsx'))
const DataManagement = React.lazy(() => import('./data-management.jsx'))

// Layout (renamed to src/Layout.jsx)
import Layout from './Layout.jsx'

// Loading fallback component
const LoadingFallback = ({ children }) => (
  <div className="flex items-center justify-center p-6">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
)

function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/icd10" element={<ICD10Browser />} />
        <Route path="/drugs" element={<DrugDatabase />} />
        <Route 
          path="/ai" 
          element={
            <AsyncErrorBoundary>
              <React.Suspense fallback={<LoadingFallback />}>
                <AIMapper />
              </React.Suspense>
            </AsyncErrorBoundary>
          } 
        />
        <Route 
          path="/search" 
          element={
            <AsyncErrorBoundary>
              <React.Suspense fallback={<LoadingFallback />}>
                <SearchTools />
              </React.Suspense>
            </AsyncErrorBoundary>
          } 
        />
        <Route 
          path="/data" 
          element={
            <AsyncErrorBoundary>
              <React.Suspense fallback={<LoadingFallback />}>
                <DataManagement />
              </React.Suspense>
            </AsyncErrorBoundary>
          } 
        />
      </Routes>
    </RouteErrorBoundary>
  )
}

export default function App() {
  return (
    <ErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <AuthProvider>
        <BrowserRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
