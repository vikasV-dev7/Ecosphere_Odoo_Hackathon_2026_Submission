"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "lucide-react";
import { useRouter } from "next/navigation";

export function ScoreExplainDrawer({
  isOpen,
  onClose,
  departmentId,
  category,
}: {
  isOpen: boolean;
  onClose: () => void;
  departmentId: string;
  category: string;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && departmentId && category) {
      setLoading(true);
      fetch(`/api/scores/explain?departmentId=${departmentId}&category=${category}`)
        .then((res) => res.json())
        .then((resData) => {
          setData(resData);
          setLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [isOpen, departmentId, category]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="capitalize">{category} Score Breakdown</SheetTitle>
          <SheetDescription>
            Detailed metrics and factors determining the current score.
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : data?.breakdowns?.length > 0 ? (
            <div className="space-y-4">
              {data.breakdowns.map((b: any) => (
                <div key={b.id} className="p-4 rounded-xl bg-card border flex flex-col space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm capitalize">{b.metricName.replace(/_/g, ' ')}</span>
                    <span className="text-primary font-bold">{b.impact > 0 ? '+' : ''}{b.impact}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Current: {b.metricValue.toFixed(1)}</span>
                    <span>Baseline: {b.baselineValue?.toFixed(1) || 'N/A'}</span>
                  </div>
                  {b.sourceUrl && (
                    <button 
                      onClick={() => {
                        onClose();
                        router.push(b.sourceUrl);
                      }}
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-2 w-fit"
                    >
                      <Link className="h-3 w-3" /> View Source Details
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              No detailed breakdowns available.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
