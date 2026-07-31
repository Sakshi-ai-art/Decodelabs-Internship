import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Generator from './pages/Generator';
import History from './pages/History';
import Analytics from './pages/Analytics';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <Layout currentPage={currentPage} setCurrentPage={setCurrentPage}>
      {currentPage === 'dashboard' && <Dashboard setCurrentPage={setCurrentPage} />}
      {currentPage === 'generator' && <Generator />}
      {currentPage === 'history' && <History />}
      {currentPage === 'analytics' && <Analytics />}
    </Layout>
  );
}
