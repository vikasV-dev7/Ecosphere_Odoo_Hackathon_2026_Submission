'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrgStore } from '@/stores/use-org-store';
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
import { 
  Heart, 
  Users, 
  Clock, 
  CheckCircle, 
  Camera, 
  Plus, 
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Calendar,
  Sparkles,
  PartyPopper,
  Compass
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function SocialDashboard() {
  const { currentUser, activeRole } = useAuthStore();
  const { departments } = useOrgStore();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isProofOpen, setIsProofOpen] = React.useState(false);
  const [selectedPartId, setSelectedPartId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form states
  const [csrForm, setCsrForm] = React.useState({
    title: '',
    categoryId: 'cat-env-act', // Default env
    description: '',
    date: '',
    location: '',
    maxParticipants: '',
    xpReward: '200',
    pointsReward: '100'
  });

  const [proofImage, setProofImage] = React.useState<string>('');

  // 1. Query CSR Activities
  const { data: activities = [], isLoading: isActsLoading } = useQuery<any[]>({
    queryKey: ['csr-activities'],
    queryFn: async () => {
      const res = await fetch('/api/social/activities');
      if (!res.ok) throw new Error('Failed to fetch activities');
      return res.json();
    }
  });

  // 2. Query Employee Participations
  const { data: participations = [], isLoading: isPartsLoading } = useQuery<any[]>({
    queryKey: ['csr-participations'],
    queryFn: async () => {
      const res = await fetch('/api/social/participations', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch participations');
      return res.json();
    }
  });

  // Mutations
  const registerMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const res = await fetch('/api/social/participations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify({
          employeeId: currentUser?.id,
          activityId
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to register');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csr-participations'] });
      confetti({ particleCount: 30, spread: 30 });
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  const uploadProofMutation = useMutation({
    mutationFn: async (vars: { id: string; proofData: string }) => {
      const res = await fetch(`/api/social/participations/${vars.id}/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify({ proofData: vars.proofData })
      });
      if (!res.ok) throw new Error('Failed to submit proof');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csr-participations'] });
      setIsProofOpen(false);
      setProofImage('');
      confetti({ particleCount: 50, spread: 45 });
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/social/participations/${id}/approve`, {
        method: 'PATCH',
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to approve');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csr-participations'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['department-scores'] });
      confetti({ particleCount: 80, spread: 60 });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/social/participations/${id}/reject`, {
        method: 'PATCH',
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to reject');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csr-participations'] });
    }
  });

  const createActivityMutation = useMutation({
    mutationFn: async (newAct: any) => {
      const res = await fetch('/api/social/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(newAct)
      });
      if (!res.ok) throw new Error('Failed to create volunteer program');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['csr-activities'] });
      setIsCreateOpen(false);
      setCsrForm({
        title: '',
        categoryId: 'cat-env-act',
        description: '',
        date: '',
        location: '',
        maxParticipants: '',
        xpReward: '200',
        pointsReward: '100'
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  if (isActsLoading || isPartsLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-[#6ea663]" />
        <p className="text-xs text-[#72796d] font-semibold">Loading engagement portal...</p>
      </div>
    );
  }

  // Calculate statistics
  const approvedParts = participations.filter(p => p.approvalStatus === 'Approved');
  const uniqueVolunteersCount = Array.from(new Set(approvedParts.map(p => p.employeeId))).length;
  const totalVolunteerHours = approvedParts.reduce((sum, p) => sum + (p.hoursSpent || 3), 0); // default 3 hours per event
  const myRegistrations = participations.filter(p => p.employeeId === currentUser?.id);
  const pendingReviewParts = participations.filter(p => p.approvalStatus === 'Submitted');

  // Radial Ring target (e.g. 78% participation rate)
  const rateData = [
    { name: 'Volunteers', value: 78, fill: '#ff7c5c' } // Warm coral accent
  ];

  // Client-side Activity Feed union
  const feedEvents = [
    ...approvedParts.map(p => ({
      type: 'volunteered',
      name: p.employee?.name || 'Employee',
      avatar: p.employee?.avatar,
      detail: `volunteered for "${p.activity?.title || 'CSR Initiative'}"`,
      date: new Date(p.completionDate || p.createdAt),
      xp: p.xpEarned
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

  const handleProofFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createActivityMutation.mutate(csrForm);
  };

  const triggerUploadProof = (partId: string) => {
    setSelectedPartId(partId);
    setProofImage('');
    setIsProofOpen(true);
  };

  const submitProofForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartId || !proofImage) return;
    uploadProofMutation.mutate({ id: selectedPartId, proofData: proofImage });
  };

  const hasWritePermission = activeRole === 'Admin' || activeRole === 'DepartmentHead';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            Social & Employee Engagement
            <Heart className="h-5 w-5 text-[#ff7c5c]" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Participate in company CSR initiatives, submit completion proof, and reward community service points.
          </p>
        </div>
        {hasWritePermission && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm" />}>
              <Plus className="h-4 w-4" /> Create CSR Activity
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
              <DialogHeader>
                <DialogTitle className="text-[#003a03]">Define Volunteer Program</DialogTitle>
                <DialogDescription>Add a community service project or environmental action.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 text-xs">
                {formError && (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="space-y-1">
                  <Label htmlFor="act-title">Program Title</Label>
                  <Input id="act-title" placeholder="e.g. Park Reforestation Drive" value={csrForm.title} onChange={(e) => setCsrForm({ ...csrForm, title: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="act-desc">Description</Label>
                  <Input id="act-desc" placeholder="Scope of the volunteer project" value={csrForm.description} onChange={(e) => setCsrForm({ ...csrForm, description: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="act-date">Date Scheduled</Label>
                    <Input id="act-date" type="datetime-local" value={csrForm.date} onChange={(e) => setCsrForm({ ...csrForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="act-loc">Location</Label>
                    <Input id="act-loc" placeholder="e.g. Central Park" value={csrForm.location} onChange={(e) => setCsrForm({ ...csrForm, location: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="act-max">Max Participants</Label>
                    <Input id="act-max" type="number" placeholder="50" value={csrForm.maxParticipants} onChange={(e) => setCsrForm({ ...csrForm, maxParticipants: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="act-xp">XP Reward</Label>
                    <Input id="act-xp" type="number" value={csrForm.xpReward} onChange={(e) => setCsrForm({ ...csrForm, xpReward: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="act-pts">Points Reward</Label>
                    <Input id="act-pts" type="number" value={csrForm.pointsReward} onChange={(e) => setCsrForm({ ...csrForm, pointsReward: e.target.value })} required />
                  </div>
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createActivityMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                    Publish Activity
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Snapshots & Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Volunteers */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-[#ff7c5c]" />
              Active Volunteers
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Unique participating employees.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-3xl font-extrabold text-[#003a03]">{uniqueVolunteersCount}</div>
            <span className="block mt-2 text-[10px] text-[#72796d]">Across all programs.</span>
          </CardContent>
        </Card>

        {/* Volunteer Hours */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-coral-500" />
              Community Hours
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Cumulative volunteer hours logged.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-3xl font-extrabold text-[#003a03]">
              {totalVolunteerHours}
              <span className="text-xs text-[#72796d] font-normal ml-1">hours</span>
            </div>
            <span className="block mt-2 text-[10px] text-[#2e6b27] font-bold">100% company sponsored.</span>
          </CardContent>
        </Card>

        {/* Active registrations */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
              My CSR Portfolio
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Registered program listings.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-3xl font-extrabold text-[#003a03]">{myRegistrations.length}</div>
            <span className="block mt-2 text-[10px] text-[#72796d]">
              {myRegistrations.filter(r => r.approvalStatus === 'Approved').length} approved submissions.
            </span>
          </CardContent>
        </Card>

        {/* Radial Target Gauge */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex items-center p-4">
          <div className="h-20 w-20 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={10} data={rateData}>
                <RadialBar dataKey="value" cornerRadius={5} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="ml-4 text-xs font-semibold">
            <h3 className="font-bold text-[#003a03]">78% Engagement</h3>
            <p className="text-[10px] text-[#72796d] font-normal leading-normal">
              Corporate target is 80% employee participation rate.
            </p>
          </div>
        </Card>
      </div>

      {/* Volunteer Programs Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#003a03] font-headline-lg flex items-center gap-1.5">
            <Compass className="h-5 w-5 text-emerald-600 animate-pulse" /> Active CSR Volunteering Initiatives
          </h2>
          <p className="text-xs text-[#72796d]">
            Register, join events, and upload proofs to gain XP rewards.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activities.map((act) => {
            const hasJoined = participations.find(p => p.activityId === act.id && p.employeeId === currentUser?.id);
            const status = hasJoined ? hasJoined.approvalStatus : 'Not Joined';

            return (
              <Card key={act.id} className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col md:flex-row overflow-hidden hover:translate-y-[-2px] transition-all duration-300">
                <div 
                  className="h-40 md:h-auto md:w-44 shrink-0 bg-cover bg-center" 
                  style={{ backgroundImage: `url(${act.imageUrl || 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=600&q=80'})` }}
                />
                <div className="p-5 flex flex-col justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[9px] font-extrabold text-[#ff7c5c] bg-[#ff7c5c]/10 border border-[#ff7c5c]/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {act.category?.name || 'Volunteering'}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                        status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status === 'Submitted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        status === 'Rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {status}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#003a03]">{act.title}</h3>
                    <p className="text-[#72796d] leading-normal">{act.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-[#72796d] font-bold">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(act.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' })}
                    </span>
                    <span>Rewards: <span className="text-[#2e6b27]">+{act.xpReward} XP</span> / <span className="text-[#63603a]">+{act.pointsReward} pts</span></span>
                  </div>

                  <div className="flex gap-2">
                    {!hasJoined ? (
                      <Button onClick={() => registerMutation.mutate(act.id)} disabled={registerMutation.isPending} className="w-full h-8 bg-[#003a03] hover:bg-[#2e6b27] text-white rounded-lg text-[10px] font-bold">
                        Register & Register
                      </Button>
                    ) : status === 'Registered' ? (
                      <Button onClick={() => triggerUploadProof(hasJoined.id)} className="w-full h-8 bg-white hover:bg-[#ff7c5c]/10 text-[#ff7c5c] border border-[#ff7c5c]/40 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                        <Camera className="h-3.5 w-3.5" /> Submit Proof
                      </Button>
                    ) : status === 'Submitted' ? (
                      <Button disabled className="w-full h-8 bg-slate-100 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-bold">
                        Proof Pending Review
                      </Button>
                    ) : (
                      <Button disabled className="w-full h-8 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5" /> Completed
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Review Participations Table (Admin & Dept Head only) */}
      {hasWritePermission && (
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Review Volunteer Proof Submissions</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Gated review panel to audit base64 proof images and approve rewards.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingReviewParts.length === 0 ? (
              <div className="flex h-28 flex-col items-center justify-center text-center text-xs text-[#72796d] p-4">
                <CheckCircle className="h-6 w-6 text-emerald-600 mb-1" />
                <p className="font-bold">All submissions caught up!</p>
                <p className="text-[10px]">No pending volunteer activities require audit.</p>
              </div>
            ) : (
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Proof Attachment</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReviewParts.map((p) => (
                    <TableRow key={p.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-bold text-[#003a03]">
                        {p.employee?.name || 'Unknown Employee'}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-800">
                        {p.activity?.title || 'CSR Initiative'}
                      </TableCell>
                      <TableCell>
                        {p.proofData ? (
                          <Dialog>
                            <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs border-[#e8e3cb] bg-white text-slate-700 flex items-center gap-1" />}>
                              <ImageIcon className="h-3.5 w-3.5 text-[#ff7c5c]" /> View Image Proof
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white border-[#e8e3cb]">
                              <DialogHeader>
                                <DialogTitle className="text-[#003a03]">Volunteer Proof</DialogTitle>
                              </DialogHeader>
                              <div className="flex items-center justify-center p-2 bg-[#fff9e6]/50 rounded-lg border border-[#e8e3cb]/30">
                                <img src={p.proofData} alt="Audit proof" className="max-h-72 object-contain rounded-md" />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : 'No proof'}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button onClick={() => rejectMutation.mutate(p.id)} disabled={rejectMutation.isPending} variant="ghost" className="h-7 text-rose-700 hover:text-rose-900 hover:bg-rose-50 text-[10px] font-bold rounded-md">
                          Reject
                        </Button>
                        <Button onClick={() => approveMutation.mutate(p.id)} disabled={approveMutation.isPending} className="h-7 bg-[#2e6b27] hover:bg-[#003a03] text-white text-[10px] font-bold rounded-md">
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

      {/* Activity Feed & Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03]">Company Activity Feed</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Audited timeline of green actions and sustainability compliance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {feedEvents.length === 0 ? (
              <p className="text-xs text-[#72796d] py-6 text-center">No recent social feed items.</p>
            ) : (
              feedEvents.map((evt, idx) => (
                <div key={idx} className="flex items-start gap-3 text-xs leading-normal border-b border-[#e8e3cb]/20 pb-3 last:border-b-0">
                  <span className="h-7 w-7 rounded-full bg-[#003a03] text-white flex items-center justify-center font-bold shrink-0 uppercase">
                    {evt.name.substring(0, 2)}
                  </span>
                  <div className="flex-1">
                    <p className="text-slate-800">
                      <span className="font-bold text-[#003a03]">{evt.name}</span> {evt.detail}
                    </p>
                    <span className="text-[10px] text-[#72796d] font-bold">
                      {evt.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#2e6b27] font-extrabold uppercase bg-[#6ea663]/10 px-2 py-0.5 rounded">
                    +{evt.xp} XP
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Top Sustainability Champions
            </CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Active community leaderboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {[
              { rank: '#1', name: 'Alice Smith', dept: 'ESG', xp: '2,500' },
              { rank: '#2', name: 'Bob Jones', dept: 'OPS', xp: '1,400' },
              { rank: '#3', name: 'Charlie Brown', dept: 'RD', xp: '450' }
            ].map((usr, i) => (
              <div key={usr.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-[#ff7c5c] w-6">{usr.rank}</span>
                  <div>
                    <h4 className="font-bold text-[#003a03]">{usr.name}</h4>
                    <span className="block text-[10px] text-[#72796d] font-bold uppercase">{usr.dept}</span>
                  </div>
                </div>
                <div className="font-bold text-slate-800">{usr.xp} XP</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Proof Upload Dialog */}
      <Dialog open={isProofOpen} onOpenChange={setIsProofOpen}>
        <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
          <DialogHeader>
            <DialogTitle className="text-[#003a03]">Submit Completion Proof</DialogTitle>
            <DialogDescription>Upload a picture or receipt validating your volunteer participation (max 500KB).</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitProofForm} className="space-y-4 py-2 text-xs">
            <div className="space-y-2">
              <Label htmlFor="proof-file">Proof Image</Label>
              <Input id="proof-file" type="file" accept="image/*" onChange={handleProofFile} required className="cursor-pointer file:bg-[#f4eedb] file:hover:bg-[#e8e3cb] file:border-0 file:rounded-md file:text-[#003a03] file:font-semibold" />
              {proofImage && (
                <div className="flex items-center justify-center p-2 bg-[#fff9e6]/50 rounded-lg border border-[#e8e3cb]/30 mt-2">
                  <img src={proofImage} alt="Preview" className="max-h-40 object-contain rounded-md" />
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={uploadProofMutation.isPending || !proofImage} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                Submit Proof for Audit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
