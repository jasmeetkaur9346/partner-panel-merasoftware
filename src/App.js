import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import PartnerDashboard from './pages/PartnerDashboard';
import TriangleMazeLoader from './components/TriangleMazeLoader';
import { useAuth } from './context/AuthContext';
import { MAIN_WEBSITE_URL } from './common';

const App = () => {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <TriangleMazeLoader />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Partner session required</h1>
        <p className="text-slate-600 max-w-md mb-6">
          Please sign in through the Staff Login on the main website and select the Partner role to access this dashboard.
        </p>
        {MAIN_WEBSITE_URL && (
          <a
            href={MAIN_WEBSITE_URL}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Go to MeraSoftware.com
          </a>
        )}
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <Routes>
          <Route path="/" element={<PartnerDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      </div>
    </Router>
  );
};

export default App;
