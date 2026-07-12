"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf, Users, Shield, Trophy, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Environment", href: "/environmental", icon: Leaf },
  { name: "Social", href: "/social", icon: Users },
  { name: "Governance", href: "/governance", icon: Shield },
  { name: "Play", href: "/gamification", icon: Trophy },
  { name: "Reports", href: "/reports", icon: BarChart2 },
];

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={cn("bg-white dark:bg-[#0F172A] border-t border-border flex items-center justify-around z-50", className)}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);
        const Icon = item.icon;
        
        return (
          <Link
            key={item.name}
            href={item.href}
            // Ensuring minimum 48x48 touch target
            className={cn(
              "flex flex-col items-center justify-center min-h-[56px] min-w-[56px] px-2 py-1 transition-colors",
              isActive 
                ? "text-primary dark:text-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-6 h-6 mb-1", isActive && "fill-primary/20")} />
            <span className="text-[10px] font-medium tracking-tight">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
