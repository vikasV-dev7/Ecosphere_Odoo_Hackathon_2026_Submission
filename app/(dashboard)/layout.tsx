'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
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
    <div className="min-h-screen bg-[#fff9e6] dark:bg-[#0F172A] text-[#1e1c11] dark:text-[#F8FAFC] antialiased flex flex-col md:flex-row">
      {/* Desktop Sidebar navigation */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main layout wrapper */}
      <div className="md:pl-64 flex-1 flex flex-col min-h-screen w-full">
        {/* Top Navbar */}
        <Header />

        {/* Dynamic page contents */}
        <main className="flex-1 mt-16 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
