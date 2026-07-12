'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrgStore } from '@/stores/use-org-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Trophy, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  TrendingUp, 
  Camera, 
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  Edit2
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function GoalsPage() {
  const { activeRole } = useAuthStore();
  const { departments } = useOrgStore();
  const queryClient = useQueryClient();

  const [selectedDept, setSelectedDept] = React.useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form Field States
  const [goalForm, setGoalForm] = React.useState({
    name: '',
    description: '',
    targetValue: '',
    unit: 'kg CO2e',
    deadline: '',
    departmentId: '',
    imageData: ''
  });

  // Edit Field States
  const [editForm, setEditForm] = React.useState({
    id: '',
    currentValue: '',
    imageData: '',
    name: ''
  });

  // 1. Fetch Goals via TanStack Query
  const { data: goals = [], isLoading: isGoalsLoading } = useQuery<any[]>({
    queryKey: ['environmental-goals', selectedDept],
    queryFn: async () => {
      const url = new URL('/api/environmental/goals', window.location.origin);
      if (selectedDept !== 'all') url.searchParams.append('departmentId', selectedDept);

      const res = await fetch(url.toString(), {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch goals');
      return res.json();
    }
  });

  // 2. Create Goal Mutation
  const createGoalMutation = useMutation({
    mutationFn: async (newGoal: any) => {
      const res = await fetch('/api/environmental/goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(newGoal),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create goal');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['environmental-goals'] });
      queryClient.invalidateQueries({ queryKey: ['carbon-transactions'] }); // score updates

      setGoalForm({
        name: '',
        description: '',
        targetValue: '',
        unit: 'kg CO2e',
        deadline: '',
        departmentId: '',
        imageData: ''
      });
      setFormError(null);
      setIsCreateOpen(false);

      confetti({
        particleCount: 50,
        spread: 40,
      });
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // 3. Update Goal Progress Mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (vars: { id: string; currentValue: number; imageData?: string }) => {
      const res = await fetch(`/api/environmental/goals/${vars.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify({
          currentValue: vars.currentValue,
          imageData: vars.imageData
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update goal progress');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-goals'] });
      queryClient.invalidateQueries({ queryKey: ['carbon-transactions'] }); // score updates

      setFormError(null);
      setIsEditOpen(false);

      if (data.status === 'Completed') {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  // File to base64 helper
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      setFormError('Image size exceeds 500KB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (isEdit) {
        setEditForm(prev => ({ ...prev, imageData: reader.result as string }));
      } else {
        setGoalForm(prev => ({ ...prev, imageData: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.name || !goalForm.description || !goalForm.targetValue || !goalForm.deadline) {
      setFormError('Please fill out all required fields.');
      return;
    }
    createGoalMutation.mutate(goalForm);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.currentValue) {
      setFormError('Please enter a current value.');
      return;
    }
    updateProgressMutation.mutate({
      id: editForm.id,
      currentValue: parseFloat(editForm.currentValue),
      imageData: editForm.imageData || undefined
    });
  };

  const triggerEdit = (goal: any) => {
    setEditForm({
      id: goal.id,
      currentValue: goal.currentValue.toString(),
      imageData: goal.imageData || '',
      name: goal.name
    });
    setFormError(null);
    setIsEditOpen(true);
  };

  const hasWritePermission = activeRole === 'Admin' || activeRole === 'DepartmentHead';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            Sustainability & ESG Goals
            <Trophy className="h-5 w-5 text-amber-500" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Establish, progress, and audit targets such as Scope reductions and green office metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || 'all')}>
            <SelectTrigger className="h-9 w-40 bg-white text-xs border-[#e8e3cb]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent className="bg-white text-xs">
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasWritePermission && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-sm" />}>
                <Plus className="h-4 w-4" /> Define Goal
              </DialogTrigger>
              <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                <DialogHeader>
                  <DialogTitle className="text-[#003a03]">Define Sustainability Goal</DialogTitle>
                  <DialogDescription>Define a new target metric to track across business units.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSubmit} className="space-y-4 py-2 text-xs">
                  {formError && (
                    <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor="goal-name">Goal Name</Label>
                    <Input id="goal-name" placeholder="e.g. Reduce scope 1 logistics fuel" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="goal-desc">Description</Label>
                    <Input id="goal-desc" placeholder="Details of the initiative" value={goalForm.description} onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="goal-target">Target Value</Label>
                      <Input id="goal-target" type="number" placeholder="5000" value={goalForm.targetValue} onChange={(e) => setGoalForm({ ...goalForm, targetValue: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="goal-unit">Unit</Label>
                      <Input id="goal-unit" placeholder="e.g. kg CO2e" value={goalForm.unit} onChange={(e) => setGoalForm({ ...goalForm, unit: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="goal-date">Target Deadline</Label>
                      <Input id="goal-date" type="date" value={goalForm.deadline} onChange={(e) => setGoalForm({ ...goalForm, deadline: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="goal-dept">Department Assignee</Label>
                      <Select value={goalForm.departmentId} onValueChange={(val) => setGoalForm({ ...goalForm, departmentId: val || '' })}>
                        <SelectTrigger id="goal-dept" className="bg-white">
                          <SelectValue placeholder="Corporate (Global)" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="corporate">Corporate (Global)</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal-image">Offset Verification File (Max 500KB)</Label>
                    <div className="flex items-center gap-3">
                      <Input id="goal-image" type="file" accept="image/*" onChange={(e) => handleFileChange(e)} className="cursor-pointer file:bg-[#f4eedb] file:hover:bg-[#e8e3cb] file:border-0 file:rounded-md file:text-[#003a03] file:font-semibold" />
                      {goalForm.imageData && <ImageIcon className="h-5 w-5 text-emerald-600" />}
                    </div>
                  </div>
                  <DialogFooter className="pt-2">
                    <Button type="submit" disabled={createGoalMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                      Create Goal
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Goals Grid */}
      {isGoalsLoading ? (
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#2e6b27]" />
          <p className="text-xs text-[#72796d]">Querying goals metrics...</p>
        </div>
      ) : goals.length === 0 ? (
        <Card className="bg-white/60 border border-[#e8e3cb] p-12 text-center flex flex-col items-center justify-center">
          <Trophy className="h-10 w-10 text-[#b2ad81] mb-2" />
          <p className="text-sm font-bold text-[#003a03]">No sustainability goals found</p>
          <p className="text-xs text-[#72796d]">There are no active initiatives matching the selected filters.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const percent = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
            const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isCompleted = goal.status === 'Completed';

            return (
              <Card key={goal.id} className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300">
                <CardHeader className="pb-3 border-b border-[#e8e3cb]/30">
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <span className="text-[10px] font-extrabold text-[#2e6b27] bg-[#6ea663]/10 px-2.5 py-0.5 rounded-full border border-[#6ea663]/25 uppercase tracking-wide">
                      {goal.department?.code || 'Corporate'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                      isCompleted 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : daysLeft < 0 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : 'bg-[#cdc89a]/20 text-[#63603a] border-[#cdc89a]/35'
                    }`}>
                      {goal.status}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-bold text-[#003a03] leading-snug">{goal.name}</CardTitle>
                  <CardDescription className="text-xs text-[#72796d] line-clamp-2 h-8 leading-normal mt-1">{goal.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-4 text-xs font-semibold">
                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#41493e] font-bold">
                      <span>Progress: {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}</span>
                      <span className="text-[#003a03]">{percent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                      <div className="h-full bg-[#2e6b27] transition-all duration-500" style={{ width: `${percent}%` }} />
                    </div>
                  </div>

                  {/* Info Footer */}
                  <div className="flex justify-between items-center text-[10px] text-[#72796d] border-t border-[#e8e3cb]/20 pt-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : 'Overdue'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {goal.imageData && (
                        <Dialog>
                          <DialogTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md" />} title="View verification image">
                            <ImageIcon className="h-4 w-4" />
                          </DialogTrigger>
                          <DialogContent className="max-w-md bg-white border-[#e8e3cb]">
                            <DialogHeader>
                              <DialogTitle className="text-[#003a03]">Offset Proof: {goal.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-2 bg-[#fff9e6]/50 rounded-lg border border-[#e8e3cb]/30">
                              <img src={goal.imageData} alt="Verification" className="max-h-72 object-contain rounded-md" />
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {hasWritePermission && (
                        <Button variant="ghost" size="icon" onClick={() => triggerEdit(goal)} className="h-7 w-7 text-[#63603a] hover:text-[#003a03] hover:bg-[#cdc89a]/15 rounded-md" title="Update goal progress">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Progress Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
          <DialogHeader>
            <DialogTitle className="text-[#003a03]">Update Progress: {editForm.name}</DialogTitle>
            <DialogDescription>Modify current metric progress. If target limit is surpassed, status updates to Completed.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="edit-val">Current Value</Label>
              <Input id="edit-val" type="number" step="0.01" value={editForm.currentValue} onChange={(e) => setEditForm({ ...editForm, currentValue: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image">Update Verification Proof Image (Optional, Max 500KB)</Label>
              <div className="flex items-center gap-3">
                <Input id="edit-image" type="file" accept="image/*" onChange={(e) => handleFileChange(e, true)} className="cursor-pointer file:bg-[#f4eedb] file:hover:bg-[#e8e3cb] file:border-0 file:rounded-md file:text-[#003a03] file:font-semibold" />
                {editForm.imageData && <CheckCircle2 className="h-5 w-5 text-emerald-600 animate-bounce" />}
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={updateProgressMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                {updateProgressMutation.isPending ? 'Updating...' : 'Update Progress'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
