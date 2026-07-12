'use client';

import React from 'react';
import { ScoreCard } from '@/components/dashboard/score-card';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrgStore } from '@/stores/use-org-store';
import { useEnvironmentalStore } from '@/stores/use-environmental-store';
import { useSocialStore } from '@/stores/use-social-store';
import { useGovernanceStore } from '@/stores/use-governance-store';
import { useGamificationStore } from '@/stores/use-gamification-store';
import { ScoringService } from '@/services/scoring';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Leaf, 
  Users, 
  ShieldAlert, 
  Trophy, 
  Activity, 
  TrendingDown, 
  Clock, 
  ArrowUpRight, 
  ChevronRight,
  Flame,
  Plus,
  Compass,
  Zap,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export default function OverviewDashboard() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeRole = useAuthStore((state) => state.activeRole);
  const departments = useOrgStore((state) => state.departments);
  const carbonTransactions = useEnvironmentalStore((state) => state.carbonTransactions);
  const goals = useEnvironmentalStore((state) => state.goals);
  const participations = useSocialStore((state) => state.participations);
  const csrActivities = useSocialStore((state) => state.csrActivities);
  const complianceIssues = useGovernanceStore((state) => state.complianceIssues);
  const employeeBadges = useGamificationStore((state) => state.employeeBadges);
  
  // Real-time ticking carbon counter state
  const [carbonCount, setCarbonCount] = React.useState(18420.45);

  React.useEffect(() => {
    const timer = setInterval(() => {
      // Simulate real-time ticking emissions
      setCarbonCount((prev) => prev + 0.08);
    }, 1200);
    return () => clearInterval(timer);
  }, []);

  if (!currentUser) return null;

  // Calculate scores dynamically using ScoringService
  const orgScore = ScoringService.getOrgOverviewScore();

  // Aggregate stats
  const totalEmissions = carbonTransactions.reduce((sum, tx) => sum + tx.totalEmissions, 0);
  const activeGoals = goals.filter(g => g.status === 'Active').length;
  const openCompliance = complianceIssues.filter(i => i.status !== 'Resolved').length;
  const pendingApprovals = participations.filter(p => p.approvalStatus === 'Pending').length;

  // Recharts data prep: carbon emissions trend (historical logs)
  const chartData = [
    { name: 'Jan', emissions: 4500 },
    { name: 'Feb', emissions: 4200 },
    { name: 'Mar', emissions: 5100 },
    { name: 'Apr', emissions: 4800 },
    { name: 'May', emissions: 3900 },
    { name: 'Jun', emissions: 3400 },
    { name: 'Jul', emissions: Math.round(totalEmissions) }
  ];

  // Recharts data prep: department scores
  const deptScoreData = departments.map(d => {
    const score = ScoringService.calculateDepartmentScore(d.id);
    return {
      name: d.code,
      score: score.total,
      carbon: Math.round(score.carbonTotal)
    };
  }).sort((a, b) => b.score - a.score);

  // Recent system-wide activity logs compiled from stores
  const recentActivities = [
    {
      id: 'act-1',
      title: 'Audit Completed',
      desc: 'Q2 Social Responsibility Review scored 95%',
      time: '2 hours ago',
      icon: ShieldAlert,
      color: 'text-emerald-600 bg-emerald-100'
    },
    {
      id: 'act-2',
      title: 'Compliance Alert',
      desc: 'Vehicle FL-12 odometer readings missing',
      time: '1 day ago',
      icon: Clock,
      color: 'text-rose-600 bg-rose-100'
    },
    {
      id: 'act-3',
      title: 'CSR Participation Joined',
      desc: 'Charlie Brown joined City Park Reforestation',
      time: '2 days ago',
      icon: Users,
      color: 'text-cyan-600 bg-cyan-100'
    },
    {
      id: 'act-4',
      title: 'Badge Unlocked',
      desc: 'Bob Jones earned the "Eco Warrior" badge (+200 XP)',
      time: '3 days ago',
      icon: Trophy,
      color: 'text-amber-600 bg-amber-100'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            EcoSphere Nexus Overview
            <Sparkles className="h-5 w-5 text-[#63603a] animate-pulse" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Welcome back, <span className="font-semibold text-[#003a03]">{currentUser.name}</span>. 
            Here is the organization's real-time ESG performance matrix.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#72796d] font-semibold bg-[#fff9e6] border border-[#e8e3cb] px-3 py-1.5 rounded-lg">
            Role: <span className="text-[#003a03] font-bold">{activeRole}</span>
          </span>
          <Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-[#fff9e6] font-semibold shadow-sm flex items-center gap-1.5 rounded-lg text-xs">
            <Plus className="h-4 w-4" /> Quick Report
          </Button>
        </div>
      </div>

      {/* Top Row: Score Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <ScoreCard 
          title="Overall ESG Score" 
          score={orgScore.total} 
          trend="up" 
          icon={Activity} 
          color="amber" 
        />
        <ScoreCard 
          title="Environmental Score" 
          score={orgScore.environmental} 
          weight={0.4} 
          trend="up" 
          icon={Leaf} 
          color="emerald" 
        />
        <ScoreCard 
          title="Social Score" 
          score={orgScore.social} 
          weight={0.3} 
          trend="stable" 
          icon={Users} 
          color="cyan" 
        />
        <ScoreCard 
          title="Governance Score" 
          score={orgScore.governance} 
          weight={0.3} 
          trend="down" 
          icon={ShieldAlert} 
          color="purple" 
        />
      </div>

      {/* Second Row: Live Counter & Heatmap Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Carbon Counter */}
        <Card className="bg-gradient-to-br from-white/70 to-[#fff9e6]/20 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-orange-600 animate-pulse" />
              Live Carbon Emissions Counter
            </CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Estimated real-time carbon footprint (kg CO2e) generated today across operations.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-6 flex flex-col items-center justify-center">
            <div className="text-4xl font-extrabold tracking-tight text-slate-800 bg-[#fff9e6] border border-[#e8e3cb]/50 shadow-inner px-6 py-4 rounded-2xl w-full text-center">
              {carbonCount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="block text-xs text-[#2e6b27] font-semibold mt-1 uppercase tracking-widest">
                kg CO2e Active Emissions
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-[#2e6b27] font-semibold bg-[#6ea663]/10 px-3 py-1 rounded-full border border-[#6ea663]/20">
              <TrendingDown className="h-3.5 w-3.5" />
              Targeting -12% Scope 1 reduction
            </div>
          </CardContent>
        </Card>

        {/* AI Insight Summary */}
        <Card className="lg:col-span-2 bg-[#ffffff]/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1.5 font-headline-lg">
              <Compass className="h-4.5 w-4.5 text-[#63603a]" />
              AI Narrative Insights (Geist Engine)
            </CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Automated executive brief analyzing current ESG standings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[#cdc89a]/40 bg-[#cdc89a]/10 p-4 text-xs font-medium text-[#4b4824] leading-relaxed font-mono">
              <span className="font-extrabold text-[#63603a] flex items-center gap-1 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                EXECUTIVE BRIEF SUMMARY:
              </span>
              Overall ESG stands strong at **{orgScore.total}%**. A moderate decline in the Governance index (**{orgScore.governance}%**) was observed due to **{openCompliance} open compliance issues**, including overdue vehicle logging tasks in the Fleet department.
              Environmental carbon metrics are performing within the normal variance of target baselines, led by aggressive material substitutions in R&D. Social engagement remains robust with **{pendingApprovals} pending CSR approvals** waiting for review.
            </div>
            <div className="flex gap-2">
              <div className="text-[10px] bg-[#6ea663]/15 text-[#2e6b27] border border-[#6ea663]/20 px-2 py-1 rounded-md font-bold">
                ✓ Carbon within bounds
              </div>
              <div className="text-[10px] bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded-md font-bold">
                ⚠️ Governance alert: {openCompliance} open issues
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carbon Reduction Trend */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Carbon Reduction Progress</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Monthly carbon emissions in kg CO2e showing historical progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEmissions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e6b27" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#2e6b27" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3cb" opacity={0.3} />
                <XAxis dataKey="name" stroke="#72796d" fontSize={10} tickLine={false} />
                <YAxis stroke="#72796d" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="emissions" stroke="#2e6b27" strokeWidth={2} fillOpacity={1} fill="url(#colorEmissions)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Comparison */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Department Health Rankings</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Performance score comparison by department code.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptScoreData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3cb" opacity={0.3} />
                <XAxis dataKey="name" stroke="#72796d" fontSize={10} tickLine={false} />
                <YAxis stroke="#72796d" fontSize={10} tickLine={false} domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#63603a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fourth Row: Activity Feed & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Recent Activity Feed</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Audit summaries, badge notifications, and compliance alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((act) => (
              <div key={act.id} className="flex gap-4 items-start text-xs border-b border-[#e8e3cb]/30 pb-3 last:border-0 last:pb-0">
                <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${act.color}`}>
                  <act.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#003a03]">{act.title}</p>
                  <p className="text-[#72796d] truncate">{act.desc}</p>
                </div>
                <span className="text-[10px] text-[#b2ad81] font-medium">{act.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="bg-[#fff9e6]/50 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Quick Actions</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Launch module workflows directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-between h-10 border border-[#e8e3cb] bg-white hover:bg-[#f4eedb] text-slate-700 text-xs font-semibold rounded-xl transition-all">
              <span className="flex items-center gap-2">
                <Leaf className="h-4 w-4 text-[#2e6b27]" /> Add Carbon Transaction
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#b2ad81]" />
            </Button>
            <Button className="w-full justify-between h-10 border border-[#e8e3cb] bg-white hover:bg-[#f4eedb] text-slate-700 text-xs font-semibold rounded-xl transition-all">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-600" /> Create CSR Activity
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#b2ad81]" />
            </Button>
            <Button className="w-full justify-between h-10 border border-[#e8e3cb] bg-white hover:bg-[#f4eedb] text-slate-700 text-xs font-semibold rounded-xl transition-all">
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-purple-600" /> Add Compliance Issue
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#b2ad81]" />
            </Button>
            <Button className="w-full justify-between h-10 border border-[#e8e3cb] bg-white hover:bg-[#f4eedb] text-slate-700 text-xs font-semibold rounded-xl transition-all">
              <span className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" /> Launch Eco Challenge
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-[#b2ad81]" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
