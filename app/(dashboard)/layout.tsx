'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { useGovernanceStore } from '@/stores/use-governance-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const checkOverdueIssues = useGovernanceStore((state) => state.checkOverdueIssues);

  React.useEffect(() => {
    checkOverdueIssues();
    const interval = setInterval(() => {
      checkOverdueIssues();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkOverdueIssues]);

  return (
    <div className="min-h-screen bg-[#fff9e6] text-[#1e1c11] antialiased">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main layout wrapper */}
      <div className="pl-64">
        {/* Top Navbar */}
        <Header />

        {/* Dynamic page contents */}
        <main className="min-h-[calc(100vh-4rem)] mt-16 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
