import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function MainLayout({ pageTitle }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header pageTitle={pageTitle} />
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
