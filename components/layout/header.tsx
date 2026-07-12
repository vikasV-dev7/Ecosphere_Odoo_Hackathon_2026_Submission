'use client';

import React from 'react';
import { useAuthStore } from '@/stores/use-auth-store';
import { NotificationBell } from './notification-bell';
import { usePathname } from 'next/navigation';
import { UserRole } from '@/types';
import { Flame, Trophy, Coins, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const pathname = usePathname();
  const { currentUser, activeRole, switchUserByRole } = useAuthStore();

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    if (paths.length === 0) return ['Overview Dashboard'];
    return paths.map((path) => {
      const formatted = path.charAt(0).toUpperCase() + path.slice(1);
      return formatted.replace(/-/g, ' ');
    });
  };

  const breadcrumbs = getBreadcrumbs();

  const handleRoleChange = (value: string) => {
    switchUserByRole(value as UserRole);
  };

  if (!currentUser) return null;

  return (
    <header className="fixed top-0 right-0 z-10 flex h-16 w-[calc(100%-16rem)] items-center justify-between border-b border-[#e8e3cb]/50 bg-[#fff9e6]/90 px-8 backdrop-blur-md text-[#1e1c11]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-semibold text-[#41493e]">
        <Compass className="h-4.5 w-4.5 text-[#72796d]" />
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb}>
            {idx > 0 && <span className="text-[#b2ad81]">/</span>}
            <span className={cn(idx === breadcrumbs.length - 1 ? "text-[#003a03]" : "")}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right Dashboard Controls */}
      <div className="flex items-center gap-6">
        {/* User Stats */}
        <div className="flex items-center gap-3 border-r border-[#e8e3cb] pr-6">
          {/* XP */}
          <div className="flex items-center gap-1 rounded-full bg-[#6ea663]/10 px-3 py-1 text-xs font-medium text-[#2e6b27] border border-[#6ea663]/20">
            <Trophy className="h-3.5 w-3.5" />
            <span>{currentUser.xp.toLocaleString()} XP</span>
            <span className="text-[9px] text-[#002201] font-extrabold bg-[#6ea663]/30 px-1.5 rounded-full ml-1">
              Lvl {Math.floor(currentUser.xp / 500) + 1}
            </span>
          </div>

          {/* Points */}
          <div className="flex items-center gap-1 rounded-full bg-[#cdc89a]/20 px-3 py-1 text-xs font-medium text-[#63603a] border border-[#cdc89a]/40">
            <Coins className="h-3.5 w-3.5" />
            <span>{currentUser.totalPoints.toLocaleString()} pts</span>
          </div>

          {/* Streak */}
          {currentUser.streakDays > 0 && (
            <div className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700 border border-orange-200">
              <Flame className="h-3.5 w-3.5 text-orange-600 animate-pulse" />
              <span>{currentUser.streakDays}d 🔥</span>
            </div>
          )}
        </div>

        {/* Demo Switch Role */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-[#72796d] uppercase tracking-wider">Role switcher:</span>
          <Select value={activeRole} onValueChange={(val) => val && switchUserByRole(val as UserRole)}>
            <SelectTrigger className="h-9 w-40 border-[#e8e3cb] bg-white text-xs font-semibold text-[#1e1c11] focus:ring-[#003a03] focus:ring-offset-[#fff9e6]">
              <SelectValue placeholder="Select Role" />
            </SelectTrigger>
            <SelectContent className="border-[#e8e3cb] bg-white text-xs text-[#1e1c11]">
              <SelectItem value="Admin">Admin (Alice)</SelectItem>
              <SelectItem value="DepartmentHead">Dept Head (Bob)</SelectItem>
              <SelectItem value="Employee">Employee (Charlie)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notification Bell */}
        <NotificationBell />

        {/* User Profile */}
        <div className="flex items-center gap-3">
          <Avatar className="h-9.5 w-9.5 border border-[#e8e3cb]">
            <AvatarImage src={currentUser.avatar || ''} alt={currentUser.name} />
            <AvatarFallback className="bg-[#003a03] text-white font-bold text-xs uppercase">
              {currentUser.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-left md:block">
            <p className="text-xs font-semibold text-[#003a03]">{currentUser.name}</p>
            <span className="block text-[9px] text-[#72796d] font-bold uppercase tracking-wider">
              {activeRole === 'DepartmentHead' ? 'Dept Head' : activeRole}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
