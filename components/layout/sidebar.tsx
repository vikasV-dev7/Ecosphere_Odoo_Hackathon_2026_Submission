'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Leaf, 
  Users, 
  ShieldAlert, 
  Award, 
  FileSpreadsheet, 
  Network, 
  Settings as SettingsIcon,
  ChevronDown,
  Globe2,
  Calendar,
  Flame,
  CheckSquare
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: any;
  subItems?: { name: string; href: string; icon: any }[];
}

export function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = React.useState<Record<string, boolean>>({
    environmental: true,
    social: true,
    governance: true,
    gamification: true,
  });

  const toggleMenu = (key: string) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navigation: SidebarItem[] = [
    { name: 'Overview Dashboard', href: '/', icon: LayoutDashboard },
    {
      name: 'Environmental',
      href: '/environmental',
      icon: Leaf,
      subItems: [
        { name: 'Dashboard', href: '/environmental', icon: LayoutDashboard },
        { name: 'Carbon Tracking', href: '/environmental/carbon', icon: Flame },
        { name: 'Sustainability Goals', href: '/environmental/goals', icon: CheckSquare },
      ],
    },
    {
      name: 'Social',
      href: '/social',
      icon: Users,
      subItems: [
        { name: 'Dashboard', href: '/social', icon: LayoutDashboard },
        { name: 'CSR Activities', href: '/social/csr', icon: Globe2 },
        { name: 'Engagement Metrics', href: '/social/engagement', icon: Users },
      ],
    },
    {
      name: 'Governance',
      href: '/governance',
      icon: ShieldAlert,
      subItems: [
        { name: 'Dashboard', href: '/governance', icon: LayoutDashboard },
        { name: 'Policies acknowledgement', href: '/governance/policies', icon: CheckSquare },
        { name: 'Audit & Compliance', href: '/governance/audits', icon: Calendar },
      ],
    },
    {
      name: 'Gamification',
      href: '/gamification',
      icon: Award,
      subItems: [
        { name: 'Gamification Hub', href: '/gamification', icon: LayoutDashboard },
        { name: 'Active Challenges', href: '/gamification?tab=hub', icon: Award },
        { name: 'Leaderboards', href: '/gamification?tab=leaderboard', icon: Network },
        { name: 'Reward Catalog', href: '/gamification?tab=store', icon: FileSpreadsheet },
      ],
    },
    { name: 'Report Builder', href: '/reports', icon: FileSpreadsheet },
    { name: 'Department Perf', href: '/departments', icon: Network },
    { name: 'Platform Settings', href: '/settings', icon: SettingsIcon },
  ];

  const isLinkActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  const isSubLinkActive = (href: string) => {
    return pathname === href;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex h-full w-64 flex-col border-r border-[#e8e3cb]/40 bg-[#fff9e6]/95 backdrop-blur-md text-[#1e1c11]">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2.5 border-b border-[#e8e3cb]/50 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#003a03]/10 text-[#003a03]">
          <Globe2 className="h-5 w-5 animate-pulse" />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-[#003a03] font-headline-lg">EcoSphere</span>
          <span className="block text-[9px] text-[#2e6b27] font-bold tracking-widest uppercase font-label-sm">NEXUS ENTERPRISE</span>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-[#b2ad81]/50">
        {navigation.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const active = isLinkActive(item.href);
          const menuKey = item.name.toLowerCase();
          const isMenuOpen = openMenus[menuKey];

          return (
            <div key={item.name} className="space-y-0.5">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(menuKey)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-[#f4eedb] hover:text-[#003a03]",
                    active ? "bg-[#f4eedb]/80 text-[#003a03] font-semibold" : "text-[#41493e]"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="h-4.5 w-4.5 text-[#2e6b27]" />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200 text-[#72796d]",
                      isMenuOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    active 
                      ? "bg-[#003a03]/10 text-[#003a03] font-semibold border-l-2 border-[#003a03]" 
                      : "text-[#41493e] hover:bg-[#f4eedb] hover:text-[#003a03]"
                  )}
                >
                  <item.icon className="h-4.5 w-4.5 text-[#2e6b27]" />
                  <span>{item.name}</span>
                </Link>
              )}

              {/* Sub-navigation */}
              {hasSubItems && isMenuOpen && (
                <div className="ml-5 pl-2 border-l border-[#e8e3cb]/60 space-y-0.5 transition-all">
                  {item.subItems!.map((subItem) => {
                    const subActive = isSubLinkActive(subItem.href);
                    return (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-150",
                          subActive 
                            ? "bg-[#f4eedb] text-[#003a03] font-semibold" 
                            : "text-[#41493e] hover:bg-[#f4eedb]/50 hover:text-[#003a03]"
                        )}
                      >
                        <subItem.icon className="h-3.5 w-3.5 opacity-80 text-[#2e6b27]" />
                        <span>{subItem.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer / Version */}
      <div className="border-t border-[#e8e3cb]/50 p-4 text-center">
        <p className="text-[10px] text-[#72796d] font-label-sm">EcoSphere Nexus v0.1.0 • Client State</p>
      </div>
    </aside>
  );
}
