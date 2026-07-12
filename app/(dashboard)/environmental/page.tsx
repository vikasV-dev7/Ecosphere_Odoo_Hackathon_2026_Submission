'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrgStore } from '@/stores/use-org-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { WeatherWidget } from '@/components/environmental/weather-widget';
import { Button } from '@/components/ui/button';
import { 
  Leaf, 
  Flame, 
  TrendingDown, 
  PieChart as PieIcon, 
  Globe, 
  Trophy, 
  Zap,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Loader2,
  Compass
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Cell,
  Pie
} from 'recharts';

export default function EnvironmentalDashboard() {
  const { currentUser, activeRole } = useAuthStore();
  const { departments } = useOrgStore();

  // State for ticking live carbon intensity
  const [liveIntensity, setLiveIntensity] = React.useState(342.15);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setLiveIntensity((prev) => prev + (Math.random() * 0.1 - 0.04));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // 1. Fetch Carbon Transactions via TanStack Query
  const { data: transactions = [], isLoading: isTxLoading } = useQuery<any[]>({
    queryKey: ['carbon-transactions'],
    queryFn: async () => {
      const res = await fetch('/api/environmental/carbon', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // 2. Fetch Environmental Goals via TanStack Query
  const { data: goals = [], isLoading: isGoalsLoading } = useQuery<any[]>({
    queryKey: ['environmental-goals'],
    queryFn: async () => {
      const res = await fetch('/api/environmental/goals', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch goals');
      return res.json();
    }
  });

  // 3. Fetch Emission Factors via TanStack Query
  const { data: factors = [], isLoading: isFactorsLoading } = useQuery<any[]>({
    queryKey: ['emission-factors'],
    queryFn: async () => {
      const res = await fetch('/api/environmental/factors', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch factors');
      return res.json();
    }
  });

  if (isTxLoading || isGoalsLoading || isFactorsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#2e6b27]" />
        <p className="text-xs text-[#72796d] font-semibold">Loading environmental parameters...</p>
      </div>
    );
  }

  // Aggregate stats
  const totalEmissions = transactions.reduce((sum, tx) => sum + tx.totalEmissions, 0);
  const activeGoalsCount = goals.filter(g => g.status === 'Active').length;

  // Source Type Breakdown
  const sourceTotals = transactions.reduce((acc: Record<string, number>, tx) => {
    acc[tx.sourceType] = (acc[tx.sourceType] || 0) + tx.totalEmissions;
    return acc;
  }, {});

  const pieData = Object.entries(sourceTotals).map(([name, value]) => ({
    name,
    value: Math.round(value)
  }));

  const COLORS = ['#003a03', '#2e6b27', '#63603a', '#b2ad81'];

  // Carbon by Department Ranking
  const deptEmissions = departments.map(d => {
    const total = transactions
      .filter(tx => tx.departmentId === d.id)
      .reduce((sum, tx) => sum + tx.totalEmissions, 0);
    return {
      code: d.code,
      name: d.name,
      emissions: Math.round(total)
    };
  }).sort((a, b) => b.emissions - a.emissions);

  // Carbon Emissions trend over months (mocking past months, inserting live data for current month)
  const chartData = [
    { name: 'Feb', emissions: 4100 },
    { name: 'Mar', emissions: 5300 },
    { name: 'Apr', emissions: 4700 },
    { name: 'May', emissions: 3800 },
    { name: 'Jun', emissions: 3100 },
    { name: 'Jul', emissions: Math.round(totalEmissions) || 2800 }
  ];

  // Offset projects lists (seeded)
  const offsetProjects = [
    {
      id: 'proj-1',
      title: 'Amazon Basin Reforestation',
      desc: 'Planting native canopy species to sequester carbon and preserve biodiversity.',
      offsetValue: '12,500 tCO2e/yr',
      status: 'Verified Gold Standard',
      image: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'proj-2',
      title: 'Kenia Wind Power Initiative',
      desc: 'Displacing grid coal power by introducing 32 renewable turbines.',
      offsetValue: '8,400 tCO2e/yr',
      status: 'CDM Certified',
      image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=600&q=80'
    }
  ];

  const hasWritePermission = activeRole === 'Admin' || activeRole === 'DepartmentHead';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            Environmental Intelligence
            <Leaf className="h-5 w-5 text-[#2e6b27]" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Monitor organization Scope 1, 2, and 3 carbon footprints, track targets, and review offset operations.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/environmental/carbon">
            <Button variant="outline" className="h-9 border-[#e8e3cb] bg-white text-slate-700 hover:bg-[#f4eedb] font-semibold text-xs rounded-lg">
              Carbon Logs
            </Button>
          </Link>
          <Link href="/environmental/goals">
            <Button variant="outline" className="h-9 border-[#e8e3cb] bg-white text-slate-700 hover:bg-[#f4eedb] font-semibold text-xs rounded-lg">
              Goals Tracking
            </Button>
          </Link>
        </div>
      </div>

      {/* Weather & Anomalies */}
      <WeatherWidget />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Intensity Counter */}
        <Card className="bg-[#ffffff]/50 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
              Live Carbon Intensity
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Average gCO2e per operating hour.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-3xl font-extrabold text-[#003a03]">
              {liveIntensity.toFixed(2)}
              <span className="text-xs text-[#72796d] font-normal ml-1">g/kWh</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-[#2e6b27] font-bold bg-[#6ea663]/10 px-2 py-0.5 rounded-full w-max">
              <TrendingDown className="h-3 w-3" /> -4.2% vs baseline
            </div>
          </CardContent>
        </Card>

        {/* Total Footprint */}
        <Card className="bg-[#ffffff]/50 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-orange-600" />
              Aggregate Footprint
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Total emissions recorded across all departments.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-3xl font-extrabold text-[#003a03]">
              {Math.round(totalEmissions).toLocaleString()}
              <span className="text-xs text-[#72796d] font-normal ml-1">kg CO2e</span>
            </div>
            <span className="block mt-2 text-[10px] text-[#72796d]">
              Calculated across {transactions.length} transactions.
            </span>
          </CardContent>
        </Card>

        {/* Active Targets */}
        <Card className="bg-[#ffffff]/50 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              Active Goals
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Active environmental goals currently being tracked.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-3xl font-extrabold text-[#003a03]">
              {activeGoalsCount}
              <span className="text-xs text-[#72796d] font-normal ml-1">goals active</span>
            </div>
            <span className="block mt-2 text-[10px] text-[#2e6b27] font-bold">
              {goals.filter(g => g.status === 'Completed').length} goals completed this year.
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Emissions Logging History</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Historical tracking of carbon output over time (kg CO2e).
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCarbon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2e6b27" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2e6b27" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e3cb" opacity={0.3} />
                <XAxis dataKey="name" stroke="#72796d" fontSize={10} tickLine={false} />
                <YAxis stroke="#72796d" fontSize={10} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="emissions" stroke="#2e6b27" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCarbon)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Categories Donut */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Emissions by Source Type</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Scope 1, 2, and 3 emission categories breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-52 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-xs text-[#72796d] flex flex-col items-center gap-1 justify-center">
                <PieIcon className="h-8 w-8 text-[#b2ad81]/50" />
                No transactions recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
          <div className="p-4 border-t border-[#e8e3cb]/30 grid grid-cols-2 gap-2 text-[10px] text-slate-700 font-semibold">
            {pieData.map((d, idx) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span className="truncate">{d.name}: {d.value} kg</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Leaderboard and Offset Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department rankings */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Departmental Emissions Rankings</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Relative carbon outputs by business units. Less output is better.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d] font-bold">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Code</th>
                    <th className="px-6 py-3">Department Name</th>
                    <th className="px-6 py-3 text-right">Total Carbon (kg CO2e)</th>
                  </tr>
                </thead>
                <tbody>
                  {deptEmissions.map((dept, index) => (
                    <tr key={dept.code} className="border-b border-[#e8e3cb]/20 hover:bg-[#fff9e6]/20">
                      <td className="px-6 py-3.5 font-bold text-[#2e6b27]">#{index + 1}</td>
                      <td className="px-6 py-3.5 font-bold text-[#003a03]">{dept.code}</td>
                      <td className="px-6 py-3.5 font-semibold">{dept.name}</td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-700">
                        {dept.emissions.toLocaleString()} kg
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Active Gamification / Green Hero Challenge */}
        <Card className="bg-gradient-to-br from-[#003a03]/5 to-transparent border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1.5 font-headline-lg">
              <Trophy className="h-4.5 w-4.5 text-amber-500" />
              Green Hero Challenge
            </CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Active operational challenges you can join to help sequester carbon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[#cdc89a]/50 bg-white p-4 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#003a03]">Carbon-Free Commuting</span>
                <span className="text-[10px] bg-[#6ea663]/15 text-[#2e6b27] border border-[#6ea663]/25 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              </div>
              <p className="text-[#72796d]">
                Walk, cycle, or take public transit to work for 5 days. Submit ticket receipts.
              </p>
              <div className="flex justify-between text-[10px] text-[#72796d] font-bold">
                <span>Reward: <span className="text-[#003a03]">+300 XP</span></span>
                <span>Deadline: July 31</span>
              </div>
            </div>

            <Link href="/gamification/challenges">
              <Button className="w-full text-xs font-semibold h-10 border border-[#e8e3cb] bg-white hover:bg-[#f4eedb] text-slate-700 flex items-center gap-1.5 rounded-xl transition-all">
                View All Challenges <ArrowRight className="h-3.5 w-3.5 text-[#b2ad81]" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Active Carbon Offset Projects */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#003a03] font-headline-lg flex items-center gap-1.5">
            <Globe className="h-5 w-5 text-emerald-600" /> Verified Carbon Offset Investments
          </h2>
          <p className="text-xs text-[#72796d]">
            Corporate environmental investments compensating for remaining Scope emissions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {offsetProjects.map(proj => (
            <Card key={proj.id} className="bg-white/60 border border-[#e8e3cb] shadow-sm overflow-hidden flex flex-col md:flex-row">
              <div 
                className="h-40 md:h-auto md:w-44 shrink-0 bg-cover bg-center" 
                style={{ backgroundImage: `url(${proj.image})` }}
              />
              <div className="p-5 flex flex-col justify-between gap-3 text-xs">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-bold text-sm text-[#003a03]">{proj.title}</h3>
                    <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wide">
                      {proj.status}
                    </span>
                  </div>
                  <p className="text-[#72796d]">{proj.desc}</p>
                </div>
                <div className="text-[10px] text-[#2e6b27] font-extrabold uppercase tracking-widest bg-[#6ea663]/10 px-2 py-1 rounded w-max">
                  Offsets: {proj.offsetValue}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
