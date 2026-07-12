'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScoreCardProps {
  title: string;
  score: number;
  weight?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: any;
  color: 'emerald' | 'cyan' | 'purple' | 'amber';
  onExplain?: () => void;
}

export function ScoreCard({ title, score, weight, trend, icon: Icon, color, onExplain }: ScoreCardProps) {
  const getGradient = () => {
    switch (color) {
      case 'emerald':
        return 'bg-white/50 border-[#6ea663]/30 hover:border-[#6ea663] text-[#2e6b27]';
      case 'cyan':
        return 'bg-white/50 border-[#cdc89a]/40 hover:border-[#cdc89a] text-[#63603a]';
      case 'purple':
        return 'bg-white/50 border-[#b1ad81]/30 hover:border-[#b1ad81] text-[#4b4824]';
      case 'amber':
        return 'bg-white/50 border-[#e8e3cb] hover:border-[#b2ad81] text-[#003a03]';
    }
  };

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-[#2e6b27]';
    if (val >= 60) return 'text-[#63603a]';
    return 'text-rose-700';
  };

  return (
    <Card className={cn(
      "relative overflow-hidden border backdrop-blur-sm transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md",
      getGradient()
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#72796d] font-label-sm">
            {title}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f4eedb] border border-[#e8e3cb]">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-1">
          <span className={cn("text-3xl font-extrabold tracking-tight", getScoreColor(score))}>
            {score}
          </span>
          <span className="text-xs text-[#72796d]">/ 100</span>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs font-medium text-[#41493e]">
          {weight !== undefined ? (
            <span>
              Weight: <span className="font-bold text-[#003a03]">{(weight * 100).toFixed(0)}%</span>
            </span>
          ) : (
            <span className="text-[#2e6b27] font-semibold bg-[#6ea663]/10 px-2 py-0.5 rounded-full text-[10px]">
              Aggregate ESG
            </span>
          )}

          {trend && (
            <div className="flex items-center gap-0.5 text-[10px]">
              {trend === 'up' && (
                <span className="flex items-center text-[#2e6b27] font-bold">
                  <ArrowUpRight className="h-3 w-3" />
                  +1.5
                </span>
              )}
              {trend === 'down' && (
                <span className="flex items-center text-rose-600 font-bold">
                  <ArrowDownRight className="h-3 w-3" />
                  -0.8
                </span>
              )}
              {trend === 'stable' && (
                <span className="flex items-center text-[#72796d] font-bold">
                  <Minus className="h-3 w-3" />
                  Stable
                </span>
              )}
            </div>
          )}
        </div>

        {onExplain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain();
            }}
            className="mt-4 flex w-full items-center justify-center gap-1 rounded-md border border-black/10 bg-black/5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#41493e] transition-colors hover:bg-black/10"
          >
            Explain This
          </button>
        )}
      </CardContent>
    </Card>

  );
}
