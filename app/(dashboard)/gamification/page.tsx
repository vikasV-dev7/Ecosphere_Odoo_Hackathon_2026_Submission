'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Flame, 
  Award, 
  ShoppingBag, 
  CheckCircle, 
  ArrowRight, 
  Loader2, 
  Camera, 
  Image as ImageIcon,
  Sparkles,
  AlertTriangle,
  Plus,
  TrendingUp,
  User,
  Users,
  Compass,
  FileCheck,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function GamificationDashboardContent() {
  const { currentUser, activeRole } = useAuthStore();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') || 'hub';

  const [activeTab, setActiveTab] = React.useState(tabParam);

  React.useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [isCreateChallengeOpen, setIsCreateChallengeOpen] = React.useState(false);
  const [isSubmitProofOpen, setIsSubmitProofOpen] = React.useState(false);
  const [selectedChallengeId, setSelectedChallengeId] = React.useState<string | null>(null);
  const [proofImage, setProofImage] = React.useState<string>('');
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form states
  const [challengeForm, setChallengeForm] = React.useState({
    title: '',
    categoryId: 'cat-eco-chal',
    description: '',
    difficulty: 'Medium',
    progressType: 'counter',
    targetValue: '5',
    evidenceRequired: 'true',
    xpReward: '300',
    pointsReward: '150',
    deadline: ''
  });

  // 1. Fetch Streak
  const { data: streak = { streakDays: 0, longestStreak: 0 } } = useQuery<any>({
    queryKey: ['employee-streak'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/streak', {
        headers: { 'x-user-email': currentUser?.email || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch streak');
      return res.json();
    }
  });

  // 2. Fetch Challenges
  const { data: challenges = [], isLoading: isChallengesLoading } = useQuery<any[]>({
    queryKey: ['challenges'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/challenges', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch challenges');
      return res.json();
    }
  });

  // 3. Fetch Badges
  const { data: badges = [], isLoading: isBadgesLoading } = useQuery<any[]>({
    queryKey: ['badges'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/badges', {
        headers: { 'x-user-email': currentUser?.email || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch badges');
      return res.json();
    }
  });

  // 4. Fetch Rewards
  const { data: rewards = [], isLoading: isRewardsLoading } = useQuery<any[]>({
    queryKey: ['rewards'],
    queryFn: async () => {
      const res = await fetch('/api/gamification/rewards');
      if (!res.ok) throw new Error('Failed to fetch rewards');
      return res.json();
    }
  });

  // 5. Fetch Leaderboard
  const [leaderboardType, setLeaderboardType] = React.useState('individual');
  const { data: leaderboard = [], isLoading: isLeaderboardLoading } = useQuery<any[]>({
    queryKey: ['leaderboard', leaderboardType],
    queryFn: async () => {
      const res = await fetch(`/api/gamification/leaderboard?type=${leaderboardType}`);
      if (!res.ok) throw new Error('Failed to fetch leaderboard');
      return res.json();
    }
  });

  // 6. Fetch My Profile (for real-time points/XP sync)
  const { data: profile } = useQuery<any>({
    queryKey: ['active-employee-profile'],
    queryFn: async () => {
      const res = await fetch('/api/employees/me', {
        headers: { 'x-user-email': currentUser?.email || '' }
      });
      if (!res.ok) throw new Error('Failed to fetch profile');
      return res.json();
    }
  });

  const employeePoints = profile?.totalPoints ?? currentUser?.totalPoints ?? 0;
  const employeeXP = profile?.xp ?? currentUser?.xp ?? 0;
  const currentLevel = Math.floor(employeeXP / 1000) + 1;
  const xpInCurrentLevel = employeeXP % 1000;
  const xpNeededForNextLevel = 1000 - xpInCurrentLevel;

  // Mutations
  const joinChallengeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/gamification/challenges/${id}/join`, {
        method: 'POST',
        headers: { 'x-user-email': currentUser?.email || '' }
      });
      if (!res.ok) throw new Error('Failed to join challenge');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      confetti({ particleCount: 20, spread: 25 });
    }
  });

  const progressChallengeMutation = useMutation({
    mutationFn: async (vars: { id: string; increment: number }) => {
      const res = await fetch(`/api/gamification/challenges/${vars.id}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({ value: vars.increment })
      });
      if (!res.ok) throw new Error('Failed to update progress');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['employee-streak'] });
      
      if (data.approvalStatus === 'Approved') {
        // Complete challenge celebration
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        // Small progress burst
        confetti({ particleCount: 15, spread: 20 });
      }
    }
  });

  const submitProofMutation = useMutation({
    mutationFn: async (vars: { id: string; proofData: string }) => {
      const res = await fetch(`/api/gamification/challenges/${vars.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({ proofData: vars.proofData })
      });
      if (!res.ok) throw new Error('Failed to submit proof');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setIsSubmitProofOpen(false);
      setProofImage('');
      confetti({ particleCount: 40, spread: 35 });
    }
  });

  const createChallengeMutation = useMutation({
    mutationFn: async (newChal: any) => {
      const res = await fetch('/api/gamification/challenges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(newChal)
      });
      if (!res.ok) throw new Error('Failed to publish challenge template');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      setIsCreateChallengeOpen(false);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const changeStatusMutation = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const res = await fetch(`/api/gamification/challenges/${vars.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify({ status: vars.status })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update challenge status');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const redeemRewardMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/gamification/rewards/${id}/redeem`, {
        method: 'POST',
        headers: { 'x-user-email': currentUser?.email || '' }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Redemption failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rewards'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      confetti({ particleCount: 100, spread: 50 });
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: async (vars: { id: string; status: string }) => {
      const res = await fetch(`/api/gamification/challenges/${vars.id}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify({ approvalStatus: vars.status })
      });
      if (!res.ok) throw new Error('Failed to review submission');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['challenges'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      confetti({ particleCount: 75, spread: 45 });
    }
  });

  if (isChallengesLoading || isBadgesLoading || isRewardsLoading || isLeaderboardLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#b2ad81]" />
        <p className="text-xs text-[#72796d] font-semibold">Opening gamification hub...</p>
      </div>
    );
  }

  // Find active participations for challenges list
  const getChallengeStatus = (chalId: string) => {
    // Check if employee has joined this challenge
    const cp = challenges.find((c) => c.id === chalId)?.participations?.find((p: any) => p.employeeId === currentUser?.id);
    return cp ? cp : null;
  };

  const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitProofForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChallengeId || !proofImage) return;
    submitProofMutation.mutate({ id: selectedChallengeId, proofData: proofImage });
  };

  const triggerSubmitProof = (chalId: string) => {
    setSelectedChallengeId(chalId);
    setProofImage('');
    setIsSubmitProofOpen(true);
  };

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    createChallengeMutation.mutate({
      ...challengeForm,
      evidenceRequired: challengeForm.evidenceRequired === 'true'
    });
  };

  const isAuditHead = activeRole === 'Admin' || activeRole === 'DepartmentHead';

  // Gather pending submissions for admin review
  const pendingChallengeReviews = challenges.flatMap((c) => 
    (c.participations || [])
      .filter((p: any) => p.approvalStatus === 'Submitted')
      .map((p: any) => ({ ...p, challenge: c }))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            Gamification Hub
            <Trophy className="h-5 w-5 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Participate in sustainability missions, unlock achievements, and redeem points for rewards.
          </p>
        </div>
        {activeRole === 'Admin' && (
          <Dialog open={isCreateChallengeOpen} onOpenChange={setIsCreateChallengeOpen}>
            <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm" />}>
              <Plus className="h-4 w-4" /> Create Challenge Template
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
              <DialogHeader>
                <DialogTitle className="text-[#003a03]">Define Sustainability Challenge</DialogTitle>
                <DialogDescription>Create a weekly or monthly ESG task catalog item.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateChallenge} className="space-y-4 py-2 text-xs">
                {formError && (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="chal-title">Challenge Title</Label>
                  <Input id="chal-title" placeholder="e.g. Bring Lunch in Tupperware" value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="chal-desc">Instructions</Label>
                  <Input id="chal-desc" placeholder="Detail how to participate" value={challengeForm.description} onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="chal-diff">Difficulty</Label>
                    <Select value={challengeForm.difficulty} onValueChange={(val) => setChallengeForm({ ...challengeForm, difficulty: val || 'Medium' })}>
                      <SelectTrigger id="chal-diff" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Easy">Easy</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chal-prog">Progress Type</Label>
                    <Select value={challengeForm.progressType} onValueChange={(val) => setChallengeForm({ ...challengeForm, progressType: val || 'counter' })}>
                      <SelectTrigger id="chal-prog" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="counter">Counter (increments)</SelectItem>
                        <SelectItem value="percentage">Percentage (0-100)</SelectItem>
                        <SelectItem value="boolean">Boolean (once completed)</SelectItem>
                        <SelectItem value="submission">Submission only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="chal-target">Target Value</Label>
                    <Input id="chal-target" type="number" value={challengeForm.targetValue} onChange={(e) => setChallengeForm({ ...challengeForm, targetValue: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chal-xp">XP Reward</Label>
                    <Input id="chal-xp" type="number" value={challengeForm.xpReward} onChange={(e) => setChallengeForm({ ...challengeForm, xpReward: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chal-pts">Points Reward</Label>
                    <Input id="chal-pts" type="number" value={challengeForm.pointsReward} onChange={(e) => setChallengeForm({ ...challengeForm, pointsReward: e.target.value })} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="chal-evid">Evidence Image Required</Label>
                    <Select value={challengeForm.evidenceRequired} onValueChange={(val) => setChallengeForm({ ...challengeForm, evidenceRequired: val || 'true' })}>
                      <SelectTrigger id="chal-evid" className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="true">Yes, photo required</SelectItem>
                        <SelectItem value="false">No, self-declaration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="chal-dead">Deadline (Optional)</Label>
                    <Input id="chal-dead" type="date" value={challengeForm.deadline} onChange={(e) => setChallengeForm({ ...challengeForm, deadline: e.target.value })} />
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createChallengeMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                    Publish Challenge (Draft)
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#f4eedb] border border-[#e8e3cb] p-1 gap-1.5 rounded-xl text-xs font-semibold text-[#72796d]">
          <TabsTrigger value="hub" className="data-[state=active]:bg-[#003a03] data-[state=active]:text-white rounded-lg px-4 py-2 font-bold flex items-center gap-1">
            <Compass className="h-4 w-4" /> Gamification Hub
          </TabsTrigger>
          <TabsTrigger value="store" className="data-[state=active]:bg-[#003a03] data-[state=active]:text-white rounded-lg px-4 py-2 font-bold flex items-center gap-1">
            <ShoppingBag className="h-4 w-4" /> Rewards Store
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="data-[state=active]:bg-[#003a03] data-[state=active]:text-white rounded-lg px-4 py-2 font-bold flex items-center gap-1">
            <Trophy className="h-4 w-4" /> Global Standings
          </TabsTrigger>
        </TabsList>

        {/* Hub Tab */}
        <TabsContent value="hub" className="space-y-8">
          {/* Standing, Streaks & Performance */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Level XP Bar */}
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between p-5 relative overflow-hidden">
              <div className="absolute right-4 top-4">
                <Sparkles className="h-10 w-10 text-[#b2ad81]/15 animate-spin" style={{ animationDuration: '20s' }} />
              </div>
              <div className="space-y-2 text-xs">
                <span className="font-extrabold uppercase text-[#72796d] text-[10px] tracking-widest block">Current Standing</span>
                <h3 className="text-3xl font-extrabold text-[#003a03] flex items-baseline gap-1">
                  Level {currentLevel}
                  <span className="text-xs text-[#72796d] font-normal ml-2">{employeeXP} cumulative XP</span>
                </h3>
              </div>
              <div className="space-y-1.5 mt-4 text-xs font-semibold">
                <div className="flex justify-between text-[#72796d]">
                  <span>{xpInCurrentLevel}/1,000 XP</span>
                  <span>{xpNeededForNextLevel} XP to Level {currentLevel + 1}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#b2ad81] to-[#cdc89a] rounded-full transition-all duration-500" style={{ width: `${(xpInCurrentLevel / 1000) * 100}%` }} />
                </div>
              </div>
            </Card>

            {/* Hot Streak widget */}
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex items-center justify-between p-5">
              <div className="space-y-1 text-xs">
                <span className="font-extrabold uppercase text-[#72796d] text-[10px] tracking-widest block">Hot Streak Counter</span>
                <h3 className="text-3xl font-extrabold text-[#003a03] flex items-baseline gap-1">
                  {streak.streakDays}
                  <span className="text-xs text-[#72796d] font-normal ml-1">consecutive days</span>
                </h3>
                <span className="block text-[10px] text-[#72796d] font-bold">
                  Longest ever streak: {streak.longestStreak} days
                </span>
              </div>
              <div className="h-16 w-16 bg-[#ff7c5c]/10 border border-[#ff7c5c]/35 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                <Flame className="h-8 w-8 text-[#ff7c5c]" />
              </div>
            </Card>

            {/* Point Balance */}
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex items-center justify-between p-5">
              <div className="space-y-1 text-xs">
                <span className="font-extrabold uppercase text-[#72796d] text-[10px] tracking-widest block">Redeemable Balance</span>
                <h3 className="text-3xl font-extrabold text-[#003a03] flex items-baseline gap-1">
                  {employeePoints}
                  <span className="text-xs text-[#72796d] font-normal ml-1">points</span>
                </h3>
                <Button onClick={() => setActiveTab('store')} variant="link" className="p-0 h-auto text-[10px] text-[#b2ad81] hover:text-[#003a03] font-bold flex items-center gap-0.5">
                  Browse Rewards Store <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="h-16 w-16 bg-[#cdc89a]/10 border border-[#cdc89a]/35 rounded-full flex items-center justify-center shrink-0">
                <ShoppingBag className="h-8 w-8 text-[#b2ad81]" />
              </div>
            </Card>
          </div>

          {/* Monthly Missions Grid */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-[#003a03] font-headline-lg flex items-center gap-1.5">
              <Zap className="h-5 w-5 text-amber-500" /> Active Sustainability Missions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {challenges.map((chal) => {
                const part = getChallengeStatus(chal.id);
                const isDraft = chal.status === 'Draft';

                return (
                  <Card key={chal.id} className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between hover:translate-y-[-1px] transition-all duration-300">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          chal.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          chal.difficulty === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {chal.difficulty}
                        </span>
                        <div className="flex gap-1">
                          {isDraft && (
                            <span className="text-[8px] font-extrabold bg-[#72796d]/15 text-[#72796d] px-2 py-0.5 rounded border border-[#72796d]/20 uppercase">
                              Draft
                            </span>
                          )}
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase ${
                            part?.approvalStatus === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            part?.approvalStatus === 'Submitted' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                            part?.approvalStatus === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-slate-50 text-slate-500 border-slate-200'
                          }`}>
                            {part ? part.approvalStatus : 'Not Joined'}
                          </span>
                        </div>
                      </div>
                      <CardTitle className="text-sm font-bold text-[#003a03] mt-2">{chal.title}</CardTitle>
                      <CardDescription className="text-xs text-[#72796d] mt-1">{chal.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0 text-xs">
                      {/* Rewards */}
                      <div className="flex justify-between items-center text-[10px] text-[#72796d] font-bold border-b border-[#e8e3cb]/30 pb-2">
                        <span>XP: <span className="text-[#2e6b27]">+{chal.xpReward} XP</span></span>
                        <span>Points: <span className="text-amber-600">+{chal.pointsReward} pts</span></span>
                        <span>Type: <span className="uppercase">{chal.progressType}</span></span>
                      </div>

                      {/* Progress Bar if Joined */}
                      {part && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-[#72796d] font-semibold">
                            <span>Progress</span>
                            <span>{part.progress}/{chal.targetValue}</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                            <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${(part.progress / chal.targetValue) * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2">
                        {!part ? (
                          <>
                            {isDraft && activeRole === 'Admin' && (
                              <Button onClick={() => changeStatusMutation.mutate({ id: chal.id, status: 'Active' })} className="w-full h-8 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold">
                                Publish to Public
                              </Button>
                            )}
                            {!isDraft && (
                              <Button onClick={() => joinChallengeMutation.mutate(chal.id)} disabled={joinChallengeMutation.isPending} className="w-full h-8 bg-[#003a03] hover:bg-[#2e6b27] text-white rounded-lg text-[10px] font-bold">
                                Accept Challenge
                              </Button>
                            )}
                          </>
                        ) : part.approvalStatus === 'Approved' ? (
                          <Button disabled className="w-full h-8 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Challenge Completed
                          </Button>
                        ) : part.approvalStatus === 'Submitted' ? (
                          <Button disabled className="w-full h-8 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">
                            Under Audit Review
                          </Button>
                        ) : (
                          <div className="flex gap-2 w-full">
                            {chal.progressType !== 'submission' && (
                              <Button onClick={() => progressChallengeMutation.mutate({ id: chal.id, increment: 1 })} disabled={progressChallengeMutation.isPending} className="flex-1 h-8 bg-white hover:bg-slate-50 border border-[#e8e3cb] text-slate-700 rounded-lg text-[10px] font-bold">
                                Log Action (+1)
                              </Button>
                            )}
                            {chal.evidenceRequired && (
                              <Button onClick={() => triggerSubmitProof(part.id)} className="flex-1 h-8 bg-white hover:bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                                <Camera className="h-3.5 w-3.5" /> Upload Proof
                              </Button>
                            )}
                            {!chal.evidenceRequired && part.progress >= chal.targetValue && (
                              <Button onClick={() => progressChallengeMutation.mutate({ id: chal.id, increment: 0 })} className="flex-1 h-8 bg-[#003a03] hover:bg-[#2e6b27] text-white rounded-lg text-[10px] font-bold">
                                Claim Rewards
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Admin Submissions Review Table (Admin & Dept Head only) */}
          {isAuditHead && (
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#003a03]">Review Challenge Submissions</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Evaluate employee upload proofs and release XP/points rewards.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {pendingChallengeReviews.length === 0 ? (
                  <div className="flex h-28 flex-col items-center justify-center text-center text-xs text-[#72796d] p-4">
                    <CheckCircle className="h-6 w-6 text-emerald-600 mb-1" />
                    <p className="font-bold">Missions audit is caught up!</p>
                  </div>
                ) : (
                  <Table className="text-xs">
                    <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Challenge Mission</TableHead>
                        <TableHead>Evidence Attachment</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingChallengeReviews.map((p: any) => (
                        <TableRow key={p.id} className="border-b border-[#e8e3cb]/20">
                          <TableCell className="font-bold text-[#003a03]">
                            {p.employee?.name || 'Employee'}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800">
                            {p.challenge?.title || 'Challenge'}
                          </TableCell>
                          <TableCell>
                            {p.proofData ? (
                              <Dialog>
                                <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs border-[#e8e3cb] bg-white text-slate-700 flex items-center gap-1" />}>
                                  <ImageIcon className="h-3.5 w-3.5 text-[#ff7c5c]" /> View Photo Evidence
                                </DialogTrigger>
                                <DialogContent className="max-w-md bg-white border-[#e8e3cb]">
                                  <DialogHeader>
                                    <DialogTitle className="text-[#003a03]">Challenge Evidence Proof</DialogTitle>
                                  </DialogHeader>
                                  <div className="flex items-center justify-center p-2 bg-[#fff9e6]/50 rounded-lg border border-[#e8e3cb]/30">
                                    <img src={p.proofData} alt="Submission evidence" className="max-h-72 object-contain rounded-md" />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : 'No proof attached'}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button onClick={() => reviewSubmissionMutation.mutate({ id: p.id, status: 'Rejected' })} disabled={reviewSubmissionMutation.isPending} variant="ghost" className="h-7 text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-[10px] font-bold rounded-md">
                              Reject
                            </Button>
                            <Button onClick={() => reviewSubmissionMutation.mutate({ id: p.id, status: 'Approved' })} disabled={reviewSubmissionMutation.isPending} className="h-7 bg-[#2e6b27] hover:bg-[#003a03] text-white text-[10px] font-bold rounded-md">
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Badge Collection & XP Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Badge Grid */}
            <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#003a03]">Badge Collection achievements</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Unlock special achievements and collect XP bonuses.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <div key={badge.id} className={`rounded-xl border p-4 text-xs font-semibold transition-all duration-300 text-center flex flex-col items-center justify-between gap-3 h-36 ${
                    badge.unlocked 
                      ? 'bg-amber-500/10 border-amber-500/30 text-[#003a03]' 
                      : 'bg-slate-50 border-slate-200 text-slate-400 opacity-60'
                  }`}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 border" style={{ backgroundColor: badge.unlocked ? '#f59e0b' : '#94a3b8', color: '#ffffff' }}>
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold">{badge.name}</h4>
                      <p className="text-[9px] text-[#72796d] mt-0.5 leading-normal max-w-[130px] mx-auto">{badge.description}</p>
                    </div>
                    <span className="text-[8px] font-extrabold uppercase bg-white/60 px-2 py-0.5 rounded shadow-sm">
                      +{badge.xpBonus} XP Bonus
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Growth trajectory */}
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1">
                  <TrendingUp className="h-4.5 w-4.5 text-amber-500" /> XP Performance History
                </CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Weekly trajectory of community XP gains.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-48 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { day: 'Mon', xp: 50 },
                    { day: 'Tue', xp: 120 },
                    { day: 'Wed', xp: 0 },
                    { day: 'Thu', xp: 300 },
                    { day: 'Fri', xp: 100 },
                    { day: 'Sat', xp: 50 },
                    { day: 'Sun', xp: employeeXP % 400 }
                  ]}>
                    <XAxis dataKey="day" stroke="#72796d" fontSize={10} tickLine={false} />
                    <YAxis stroke="#72796d" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(178,173,129,0.1)' }} />
                    <Bar dataKey="xp" fill="#b2ad81" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Store Tab */}
        <TabsContent value="store" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/30 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#003a03] font-headline-lg flex items-center gap-1.5">
                <ShoppingBag className="h-5 w-5 text-amber-500" /> Redeemable rewards catalog
              </h2>
              <p className="text-xs text-[#72796d]">
                Deduct points balance to purchase corporate items or carbon offsets.
              </p>
            </div>
            <div className="bg-[#cdc89a]/10 border border-[#cdc89a]/35 px-4 py-2 rounded-xl text-right">
              <span className="text-[10px] text-[#72796d] uppercase font-bold block">Available Balance</span>
              <span className="text-2xl font-extrabold text-[#003a03]">{employeePoints} pts</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const isOutOfStock = reward.stock <= 0;
              const hasEnoughPoints = employeePoints >= reward.pointsRequired;

              return (
                <Card key={reward.id} className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between overflow-hidden hover:translate-y-[-2px] transition-all duration-300">
                  <div 
                    className="h-44 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${reward.imageUrl || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80'})` }}
                  />
                  <div className="p-5 space-y-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-wider ${
                          isOutOfStock ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isOutOfStock ? 'Out Of Stock' : `Stock: ${reward.stock}`}
                        </span>
                        <span className="text-sm font-extrabold text-amber-600">{reward.pointsRequired} pts</span>
                      </div>
                      <h3 className="font-bold text-sm text-[#003a03] mt-1">{reward.name}</h3>
                      <p className="text-[#72796d] leading-normal">{reward.description}</p>
                    </div>

                    <Button onClick={() => redeemRewardMutation.mutate(reward.id)} disabled={isOutOfStock || !hasEnoughPoints || redeemRewardMutation.isPending} className={`w-full h-9 rounded-lg text-xs font-bold text-white ${
                      isOutOfStock ? 'bg-slate-200 text-slate-500 cursor-not-allowed hover:bg-slate-200' :
                      !hasEnoughPoints ? 'bg-slate-200 text-slate-500 hover:bg-slate-200/90' :
                      'bg-[#003a03] hover:bg-[#2e6b27]'
                    }`}>
                      {isOutOfStock ? 'Sold Out' : !hasEnoughPoints ? 'Insufficient Balance' : 'Redeem Reward'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Leaderboard Tab */}
        <TabsContent value="leaderboard" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/30 pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#003a03] font-headline-lg flex items-center gap-1.5">
                <Trophy className="h-5 w-5 text-amber-500" /> Leaderboard standings
              </h2>
              <p className="text-xs text-[#72796d]">
                Track top sustainability champions and department carbon grades.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setLeaderboardType('individual')} className={`h-8 text-[10px] font-bold rounded-lg ${leaderboardType === 'individual' ? 'bg-[#003a03] text-white' : 'bg-[#f4eedb] border border-[#e8e3cb] text-slate-700'}`}>
                Individual Champions
              </Button>
              <Button onClick={() => setLeaderboardType('department')} className={`h-8 text-[10px] font-bold rounded-lg ${leaderboardType === 'department' ? 'bg-[#003a03] text-white' : 'bg-[#f4eedb] border border-[#e8e3cb] text-slate-700'}`}>
                Department Standings
              </Button>
            </div>
          </div>

          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>{leaderboardType === 'individual' ? 'Champion Name' : 'Department'}</TableHead>
                    <TableHead>{leaderboardType === 'individual' ? 'Department' : 'Environmental'}</TableHead>
                    <TableHead>{leaderboardType === 'individual' ? 'Level' : 'Social'}</TableHead>
                    <TableHead className="text-right">{leaderboardType === 'individual' ? 'Total XP' : 'ESG Grade'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((row) => (
                    <TableRow key={row.rank} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-mono font-extrabold text-[#ff7c5c] text-sm">{row.rank}</TableCell>
                      <TableCell className="font-bold text-[#003a03]">
                        {leaderboardType === 'individual' ? (
                          <div className="flex items-center gap-2">
                            {row.avatar ? (
                              <img src={row.avatar} alt="Avatar" className="h-6 w-6 rounded-full" />
                            ) : (
                              <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600"><User className="h-3.5 w-3.5" /></span>
                            )}
                            {row.name}
                          </div>
                        ) : (
                          `${row.name} (${row.code})`
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {leaderboardType === 'individual' ? row.department : `${row.environmentalScore}%`}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-slate-600">
                        {leaderboardType === 'individual' ? `Lvl ${row.level}` : `${row.socialScore}%`}
                      </TableCell>
                      <TableCell className="text-right font-mono font-extrabold text-sm text-[#2e6b27]">
                        {leaderboardType === 'individual' ? `${row.xp} XP` : `${row.totalScore}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Proof Submission Dialog */}
      <Dialog open={isSubmitProofOpen} onOpenChange={setIsSubmitProofOpen}>
        <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
          <DialogHeader>
            <DialogTitle className="text-[#003a03]">Submit Challenge Completion Proof</DialogTitle>
            <DialogDescription>Attach validation proof (photo or screenshot) to complete this challenge mission (max 500KB).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitProofForm} className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label htmlFor="proof-file">Upload Image</Label>
              <Input id="proof-file" type="file" accept="image/*" onChange={handleProofFile} required className="cursor-pointer file:bg-[#f4eedb] file:hover:bg-[#e8e3cb] file:border-0 file:rounded-md file:text-[#003a03] file:font-semibold" />
              {proofImage && (
                <div className="flex items-center justify-center p-2 bg-[#fff9e6]/50 rounded-lg border border-[#e8e3cb]/30 mt-2">
                  <img src={proofImage} alt="Preview" className="max-h-40 object-contain rounded-md" />
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={submitProofMutation.isPending || !proofImage} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                Submit for Audit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function GamificationDashboard() {
  return (
    <React.Suspense fallback={
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#b2ad81]" />
        <p className="text-xs text-[#72796d] font-semibold">Opening gamification hub...</p>
      </div>
    }>
      <GamificationDashboardContent />
    </React.Suspense>
  );
}
