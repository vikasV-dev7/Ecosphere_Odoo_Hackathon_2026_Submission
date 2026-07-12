"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivitySquare, Leaf, ShieldCheck, Calculator } from "lucide-react";

export function ScoreSimulator({ departments }: { departments: any[] }) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [carbonReduction, setCarbonReduction] = useState([0]);
  const [csrBoost, setCsrBoost] = useState([0]);
  const [policyAck, setPolicyAck] = useState([100]);
  const [auditScore, setAuditScore] = useState([100]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const simulate = async () => {
    if (!departmentId) return;
    setLoading(true);
    try {
      const res = await fetch("/api/scores/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          carbonReductionPct: carbonReduction[0],
          csrParticipationBoost: csrBoost[0],
          policyAckRate: policyAck[0],
          auditScore: auditScore[0],
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          ESG Score Simulator
        </CardTitle>
        <CardDescription>
          Adjust the sliders to see how various initiatives impact your final ESG score.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Department</label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Leaf className="h-4 w-4 text-green-500" /> Carbon Reduction (%)
                  </label>
                  <span className="text-sm font-bold text-green-600">{carbonReduction[0]}%</span>
                </div>
                <Slider min={-50} max={100} step={5} value={carbonReduction} onValueChange={(v: any) => setCarbonReduction(v as number[])} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ActivitySquare className="h-4 w-4 text-blue-500" /> CSR Participation Boost (%)
                  </label>
                  <span className="text-sm font-bold text-blue-600">+{csrBoost[0]}%</span>
                </div>
                <Slider min={0} max={100} step={5} value={csrBoost} onValueChange={(v: any) => setCsrBoost(v as number[])} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-500" /> Policy Acknowledgment Rate (%)
                  </label>
                  <span className="text-sm font-bold text-purple-600">{policyAck[0]}%</span>
                </div>
                <Slider min={0} max={100} step={5} value={policyAck} onValueChange={(v: any) => setPolicyAck(v as number[])} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-purple-500" /> Target Audit Score
                  </label>
                  <span className="text-sm font-bold text-purple-600">{auditScore[0]}</span>
                </div>
                <Slider min={0} max={100} step={1} value={auditScore} onValueChange={(v: any) => setAuditScore(v as number[])} />
              </div>
            </div>

            <Button onClick={simulate} disabled={loading} className="w-full">
              {loading ? "Simulating..." : "Run Simulation"}
            </Button>
          </div>

          <div className="bg-muted/30 p-6 rounded-xl border flex flex-col justify-center items-center">
            {result ? (
              <div className="w-full space-y-6">
                <h3 className="text-center font-bold text-xl mb-4">Simulation Results</h3>
                <div className="flex justify-between items-center p-4 bg-background border rounded-lg shadow-sm">
                  <span className="font-medium text-muted-foreground">Total ESG Score</span>
                  <div className="flex items-center gap-3">
                    <span className="text-lg line-through text-muted-foreground">{result.current.totalScore.toFixed(1)}</span>
                    <span className="text-2xl font-bold text-primary">{result.simulated.totalScore.toFixed(1)}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-background border rounded-lg text-center shadow-sm">
                    <span className="block text-xs text-muted-foreground mb-1">Environment</span>
                    <span className="font-bold text-green-600">{result.simulated.environmentalScore.toFixed(1)}</span>
                  </div>
                  <div className="p-3 bg-background border rounded-lg text-center shadow-sm">
                    <span className="block text-xs text-muted-foreground mb-1">Social</span>
                    <span className="font-bold text-blue-600">{result.simulated.socialScore.toFixed(1)}</span>
                  </div>
                  <div className="p-3 bg-background border rounded-lg text-center shadow-sm">
                    <span className="block text-xs text-muted-foreground mb-1">Governance</span>
                    <span className="font-bold text-purple-600">{result.simulated.governanceScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground max-w-[200px]">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>Run a simulation to see the projected impact on your ESG scores.</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
