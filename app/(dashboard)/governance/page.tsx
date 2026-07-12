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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShieldCheck, 
  AlertOctagon, 
  FileText, 
  Plus, 
  Compass, 
  HelpCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  ClipboardList,
  Sparkles,
  CheckCircle,
  Clock
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

export default function GovernanceDashboard() {
  const { currentUser, activeRole } = useAuthStore();
  const { departments } = useOrgStore();
  const queryClient = useQueryClient();

  const [isAuditOpen, setIsAuditOpen] = React.useState(false);
  const [isFindingOpen, setIsFindingOpen] = React.useState(false);
  const [selectedAuditId, setSelectedAuditId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form states
  const [auditForm, setAuditForm] = React.useState({
    departmentId: '',
    policyId: '',
    auditor: '',
    findings: '',
    score: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [findingForm, setFindingForm] = React.useState({
    severity: 'Medium',
    description: '',
    owner: '',
    dueDate: ''
  });

  // 1. Query Policies
  const { data: policies = [], isLoading: isPoliciesLoading } = useQuery<any[]>({
    queryKey: ['governance-policies'],
    queryFn: async () => {
      const res = await fetch('/api/governance/policies', {
        headers: { 
          'x-user-email': currentUser?.email || '',
          'x-user-role': activeRole 
        }
      });
      if (!res.ok) throw new Error('Failed to fetch policies');
      return res.json();
    }
  });

  // 2. Query Audits
  const { data: audits = [], isLoading: isAuditsLoading } = useQuery<any[]>({
    queryKey: ['governance-audits'],
    queryFn: async () => {
      const res = await fetch('/api/governance/audits', {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch audits');
      return res.json();
    }
  });

  // 3. Query Compliance Issues
  const { data: issues = [], isLoading: isIssuesLoading } = useQuery<any[]>({
    queryKey: ['compliance-issues'],
    queryFn: async () => {
      const res = await fetch('/api/governance/issues', {
        headers: { 
          'x-user-email': currentUser?.email || '',
          'x-user-role': activeRole 
        }
      });
      if (!res.ok) throw new Error('Failed to fetch issues');
      return res.json();
    }
  });

  // Mutations
  const acknowledgeMutation = useMutation({
    mutationFn: async (policyId: string) => {
      const res = await fetch(`/api/governance/policies/${policyId}/acknowledge`, {
        method: 'POST',
        headers: { 
          'x-user-email': currentUser?.email || '',
          'x-user-role': activeRole 
        }
      });
      if (!res.ok) throw new Error('Failed to acknowledge policy');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-policies'] });
      queryClient.invalidateQueries({ queryKey: ['active-employee-profile'] });
      queryClient.invalidateQueries({ queryKey: ['department-scores'] });
      confetti({ particleCount: 50, spread: 40 });
    }
  });

  const createAuditMutation = useMutation({
    mutationFn: async (newAudit: any) => {
      const res = await fetch('/api/governance/audits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(newAudit)
      });
      if (!res.ok) throw new Error('Failed to log audit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-audits'] });
      queryClient.invalidateQueries({ queryKey: ['department-scores'] });
      setIsAuditOpen(false);
      setAuditForm({
        departmentId: '',
        policyId: '',
        auditor: '',
        findings: '',
        score: '',
        date: new Date().toISOString().split('T')[0]
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const createFindingMutation = useMutation({
    mutationFn: async (vars: { auditId: string; finding: any }) => {
      const res = await fetch(`/api/governance/audits/${vars.auditId}/findings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(vars.finding)
      });
      if (!res.ok) throw new Error('Failed to create finding gap');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['governance-audits'] });
      queryClient.invalidateQueries({ queryKey: ['compliance-issues'] });
      queryClient.invalidateQueries({ queryKey: ['department-scores'] });
      setIsFindingOpen(false);
      setFindingForm({
        severity: 'Medium',
        description: '',
        owner: '',
        dueDate: ''
      });
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const res = await fetch(`/api/governance/issues/${issueId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole,
          'x-user-email': currentUser?.email || ''
        },
        body: JSON.stringify({ status: 'Resolved' })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to resolve issue');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-issues'] });
      queryClient.invalidateQueries({ queryKey: ['governance-audits'] });
      queryClient.invalidateQueries({ queryKey: ['department-scores'] });
      confetti({ particleCount: 40, spread: 30 });
    },
    onError: (err: any) => {
      alert(err.message);
    }
  });

  if (isPoliciesLoading || isAuditsLoading || isIssuesLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-xs text-[#72796d] font-semibold">Loading governance matrices...</p>
      </div>
    );
  }

  // Calculate stats
  const completedAudits = audits.filter(a => a.status === 'Completed');
  const auditAverage = completedAudits.length > 0 
    ? Math.round(completedAudits.reduce((sum, a) => sum + (a.score || 100), 0) / completedAudits.length)
    : 95;

  const openIssues = issues.filter(i => i.status === 'Open');
  const criticalIssuesCount = openIssues.filter(i => i.severity === 'Critical').length;
  const highIssuesCount = openIssues.filter(i => i.severity === 'High').length;

  const pendingPolicyAcks = policies.filter(p => p.ackStatus === 'Pending');

  // Governance Heat-Grid calculations by department
  const deptRiskScores = departments.map((dept) => {
    // Get open issues for this department
    const deptIssues = openIssues.filter((iss: any) => {
      const audit = audits.find((a: any) => a.id === iss.auditId);
      return audit?.departmentId === dept.id;
    });

    let totalRisk = 0;
    deptIssues.forEach((iss: any) => {
      let severityWeight = 1;
      if (iss.severity === 'Critical') severityWeight = 4;
      else if (iss.severity === 'High') severityWeight = 3;
      else if (iss.severity === 'Medium') severityWeight = 2;

      const daysToDue = Math.ceil((new Date(iss.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      const penaltyFactor = 1 / Math.max(1, daysToDue);
      totalRisk += severityWeight * penaltyFactor;
    });

    const averageRisk = deptIssues.length > 0 ? parseFloat((totalRisk / deptIssues.length).toFixed(2)) : 0;

    // Heat Grid color assignments
    let colorClass = 'bg-[#6ea663]/10 text-[#2e6b27] border-[#6ea663]/30'; // Green: 0
    if (averageRisk > 0 && averageRisk <= 1.0) {
      colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200'; // Yellow
    } else if (averageRisk > 1.0 && averageRisk <= 2.0) {
      colorClass = 'bg-orange-50 text-orange-700 border-orange-200'; // Orange
    } else if (averageRisk > 2.0) {
      colorClass = 'bg-rose-50 text-rose-700 border-rose-200'; // Red
    }

    return {
      ...dept,
      riskScore: averageRisk,
      openIssuesCount: deptIssues.length,
      colorClass
    };
  });

  const handleAuditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createAuditMutation.mutate(auditForm);
  };

  const triggerFinding = (auditId: string) => {
    setSelectedAuditId(auditId);
    setFindingForm({
      severity: 'Medium',
      description: '',
      owner: '',
      dueDate: ''
    });
    setIsFindingOpen(true);
  };

  const handleFindingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAuditId) return;
    createFindingMutation.mutate({ auditId: selectedAuditId, finding: findingForm });
  };

  const isAdmin = activeRole === 'Admin';
  const hasWritePermission = activeRole === 'Admin' || activeRole === 'DepartmentHead';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            AI Governance & compliance
            <ShieldCheck className="h-5 w-5 text-blue-600" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Review corporate regulatory code, track policy training sign-offs, and log operational compliance audits.
          </p>
        </div>
        {isAdmin && (
          <Dialog open={isAuditOpen} onOpenChange={setIsAuditOpen}>
            <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 shadow-sm" />}>
              <Plus className="h-4 w-4" /> Create Audit Log
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
              <DialogHeader>
                <DialogTitle className="text-[#003a03]">Create Compliance Audit Log</DialogTitle>
                <DialogDescription>Add a formal audit finding or compliance evaluation score.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAuditSubmit} className="space-y-4 py-2 text-xs">
                {formError && (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {/* Department Selection */}
                <div className="space-y-1">
                  <Label htmlFor="audit-dept">Department audited</Label>
                  <Select value={auditForm.departmentId} onValueChange={(val) => setAuditForm({ ...auditForm, departmentId: val || '' })}>
                    <SelectTrigger id="audit-dept" className="bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Policy Reference */}
                <div className="space-y-1">
                  <Label htmlFor="audit-policy">Related Policy Guideline (Optional)</Label>
                  <Select value={auditForm.policyId} onValueChange={(val) => setAuditForm({ ...auditForm, policyId: val || '' })}>
                    <SelectTrigger id="audit-policy" className="bg-white">
                      <SelectValue placeholder="Select Corporate Policy" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="none">No specific policy reference</SelectItem>
                      {policies.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.title} ({p.version})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Auditor */}
                <div className="space-y-1">
                  <Label htmlFor="audit-auditor">Auditor Name / Email</Label>
                  <Input id="audit-auditor" placeholder="e.g. Alice Smith (ESG)" value={auditForm.auditor} onChange={(e) => setAuditForm({ ...auditForm, auditor: e.target.value })} required />
                </div>
                {/* Score & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="audit-score">Audit Score (0-100)</Label>
                    <Input id="audit-score" type="number" min="0" max="100" placeholder="e.g. 92" value={auditForm.score} onChange={(e) => setAuditForm({ ...auditForm, score: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="audit-date">Audit Date</Label>
                    <Input id="audit-date" type="date" value={auditForm.date} onChange={(e) => setAuditForm({ ...auditForm, date: e.target.value })} required />
                  </div>
                </div>
                {/* Findings */}
                <div className="space-y-1">
                  <Label htmlFor="audit-findings">Audit Findings Notes</Label>
                  <Input id="audit-findings" placeholder="Compliance notes, storage controls, vendor reviews..." value={auditForm.findings} onChange={(e) => setAuditForm({ ...auditForm, findings: e.target.value })} required />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createAuditMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                    Publish Audit
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Snapshots & Risk Matrix Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance gauge */}
        <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm flex flex-col justify-between p-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <ShieldCheck className="h-4.5 w-4.5 text-blue-600" />
              Audit Score Average
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Average score across all completed regulatory audits.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-40 flex items-center justify-center relative">
            <div className="text-center">
              <div className="text-4xl font-extrabold text-[#003a03]">{auditAverage}%</div>
              <span className="text-[10px] text-[#2e6b27] font-bold bg-[#6ea663]/10 px-2 py-0.5 rounded-full mt-2 inline-block">
                Healthy (Standard &gt; 80)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Governance Risk Matrix Heat Grid */}
        <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-[#72796d] flex items-center gap-1.5">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
              Departmental Compliance Risk Matrix
            </CardTitle>
            <CardDescription className="text-[10px] text-[#72796d]">
              Visual heat grid mapping risk levels: Green (0), Yellow (0.1–1.0), Orange (1.0–2.0), Red (&gt;2.0). Risk decreases as due dates approach closure.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {deptRiskScores.map((dept) => (
                <div key={dept.id} className={`rounded-xl border p-4 text-xs font-semibold shadow-inner transition-all flex flex-col justify-between h-24 ${dept.colorClass}`}>
                  <div className="flex justify-between items-start">
                    <span className="font-extrabold text-sm">{dept.code}</span>
                    <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded font-bold">
                      Risk: {dept.riskScore}
                    </span>
                  </div>
                  <div className="flex justify-between items-end text-[10px]">
                    <span className="truncate max-w-[90px]">{dept.name}</span>
                    <span className="font-bold">{dept.openIssuesCount} issues</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Library Section */}
      <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[#003a03] flex items-center gap-1.5">
            <FileText className="h-4.5 w-4.5 text-blue-600" />
            Active Policies & Acknowledgements
          </CardTitle>
          <CardDescription className="text-xs text-[#72796d]">
            View corporate environmental guidelines and verify your training requirements.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {policies.length === 0 ? (
            <p className="text-xs text-[#72796d] py-6 text-center">No compliance policies published.</p>
          ) : (
            <Table className="text-xs">
              <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                <TableRow>
                  <TableHead>Policy Document</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Effective Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Acknowledge Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => {
                  const isAcked = p.ackStatus === 'Acknowledged';
                  const daysLeft = p.dueDate ? Math.ceil((new Date(p.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 30;

                  return (
                    <TableRow key={p.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-bold text-[#003a03] max-w-[250px]">
                        <div>
                          <h4 className="leading-snug">{p.title}</h4>
                          <p className="text-[10px] text-[#72796d] font-normal leading-normal truncate mt-0.5" title={p.content}>{p.content}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{p.version}</TableCell>
                      <TableCell className="font-mono">
                        {new Date(p.effectiveDate).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="font-mono text-[#72796d]">
                        {isAcked ? '-' : daysLeft > 0 ? `${daysLeft} days` : 'Overdue'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                          isAcked 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : daysLeft < 0 
                              ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isAcked ? 'Acknowledged' : daysLeft < 0 ? 'Overdue' : 'Pending'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isAcked ? (
                          <Button onClick={() => acknowledgeMutation.mutate(p.id)} disabled={acknowledgeMutation.isPending} className="h-7 bg-[#003a03] hover:bg-[#2e6b27] text-white text-[10px] font-bold rounded-md">
                            Acknowledge
                          </Button>
                        ) : (
                          <span className="text-[10px] text-[#2e6b27] font-bold flex items-center justify-end gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Confirmed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Audits & Issues Tabs */}
      <Tabs defaultValue="issues" className="space-y-4">
        <TabsList className="bg-[#f4eedb] border border-[#e8e3cb] p-1 gap-1.5 rounded-xl text-xs font-semibold text-[#72796d]">
          <TabsTrigger value="issues" className="data-[state=active]:bg-[#003a03] data-[state=active]:text-white rounded-lg px-4 py-2 font-bold">
            Compliance Issues ({openIssues.length})
          </TabsTrigger>
          <TabsTrigger value="audits" className="data-[state=active]:bg-[#003a03] data-[state=active]:text-white rounded-lg px-4 py-2 font-bold">
            Audit Timeline & History ({audits.length})
          </TabsTrigger>
        </TabsList>

        {/* Compliance Issues */}
        <TabsContent value="issues">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardContent className="p-0">
              {issues.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-[#72796d]">
                  <ShieldCheck className="h-8 w-8 text-emerald-600 mb-1" />
                  <p className="font-bold">No compliance issues logged</p>
                  <p className="text-[10px]">Active department complies fully with all rules.</p>
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                    <TableRow>
                      <TableHead>Severity</TableHead>
                      <TableHead>Issue Description</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issues.map((iss) => {
                      const isOpen = iss.status === 'Open';
                      const isOwner = currentUser?.email === iss.owner || currentUser?.name === iss.owner;
                      const hasResolvePerm = isAdmin || isOwner;

                      return (
                        <TableRow key={iss.id} className="border-b border-[#e8e3cb]/20">
                          <TableCell>
                            <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded border uppercase ${
                              iss.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              iss.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                              iss.severity === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {iss.severity}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-slate-800 max-w-[300px]">
                            {iss.description}
                          </TableCell>
                          <TableCell className="font-bold text-[#003a03]">{iss.owner}</TableCell>
                          <TableCell className="font-mono">
                            {new Date(iss.dueDate).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              isOpen ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {iss.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            {isOpen && hasResolvePerm ? (
                              <Button onClick={() => resolveIssueMutation.mutate(iss.id)} disabled={resolveIssueMutation.isPending} className="h-7 bg-[#2e6b27] hover:bg-[#003a03] text-white text-[10px] font-bold rounded-md">
                                Mark Resolved
                              </Button>
                            ) : isOpen ? (
                              <span className="text-[10px] text-slate-400 font-bold flex items-center justify-end gap-1">
                                <Clock className="h-3.5 w-3.5" /> Gated to Owner
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                <CheckCircle className="h-3.5 w-3.5" /> Resolved
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Timeline */}
        <TabsContent value="audits">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardContent className="p-0">
              {audits.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center text-xs text-[#72796d]">
                  <ClipboardList className="h-8 w-8 text-[#b2ad81] mb-1" />
                  <p className="font-bold">No audits published</p>
                  <p className="text-[10px]">Create an audit score to get started.</p>
                </div>
              ) : (
                <Table className="text-xs">
                  <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d]">
                    <TableRow>
                      <TableHead>Audit Date</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Auditor</TableHead>
                      <TableHead>Findings & Gaps</TableHead>
                      <TableHead className="text-right">Compliance Score</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {audits.map((a) => (
                      <TableRow key={a.id} className="border-b border-[#e8e3cb]/20">
                        <TableCell className="font-mono">
                          {new Date(a.date).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="font-bold text-[#003a03]">{a.department?.name || 'N/A'}</TableCell>
                        <TableCell className="font-semibold text-slate-800">{a.auditor}</TableCell>
                        <TableCell className="max-w-[300px]">
                          <div>
                            <p className="text-slate-700 leading-normal">{a.findings}</p>
                            {a.complianceIssues && a.complianceIssues.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {a.complianceIssues.map((issue: any) => (
                                  <span key={issue.id} className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                    issue.status === 'Open' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}>
                                    {issue.severity}: {issue.status}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-extrabold text-sm text-[#2e6b27]">
                          {a.score}%
                        </TableCell>
                        <TableCell className="text-right">
                          {isAdmin ? (
                            <Button onClick={() => triggerFinding(a.id)} className="h-7 bg-white hover:bg-slate-100 border border-[#e8e3cb] text-slate-700 text-[10px] font-bold rounded-md flex items-center justify-center gap-1 shadow-sm">
                              <Plus className="h-3 w-3" /> Log Compliance Gap
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Locked</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Static Suggestions Gap Card (De-scoping AI to reports) */}
      <Card className="bg-[#003a03]/5 border border-[#e8e3cb] p-5 flex flex-col sm:flex-row gap-4 justify-between items-center text-xs">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-600 shrink-0 animate-bounce" />
          <div className="space-y-1">
            <h4 className="font-extrabold text-[#003a03]">Regulatory Compliance Insights</h4>
            <p className="text-[#72796d] leading-normal max-w-2xl">
              Audit score warning thresholds have been set. Departments scoring below 80% should review mandatory vendor policies. Complete assigned policy training to avoid risk penalties.
            </p>
          </div>
        </div>
      </Card>

      {/* Log Compliance Gap Dialog */}
      <Dialog open={isFindingOpen} onOpenChange={setIsFindingOpen}>
        <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
          <DialogHeader>
            <DialogTitle className="text-[#003a03]">Log Compliance Gap / Issue</DialogTitle>
            <DialogDescription>Create a compliance issue gap tied directly to this audit report.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFindingSubmit} className="space-y-4 py-2 text-xs">
            {formError && (
              <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="gap-sev">Severity Level</Label>
                <Select value={findingForm.severity} onValueChange={(val) => setFindingForm({ ...findingForm, severity: val || 'Medium' })}>
                  <SelectTrigger id="gap-sev" className="bg-white">
                    <SelectValue placeholder="Select Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="gap-owner">Owner Email / Name</Label>
                <Input id="gap-owner" placeholder="e.g. charlie@ecosphere.com" value={findingForm.owner} onChange={(e) => setFindingForm({ ...findingForm, owner: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gap-due">Resolution Due Date</Label>
              <Input id="gap-due" type="date" value={findingForm.dueDate} onChange={(e) => setFindingForm({ ...findingForm, dueDate: e.target.value })} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="gap-desc">Gap Description</Label>
              <Input id="gap-desc" placeholder="Describe the compliance violation..." value={findingForm.description} onChange={(e) => setFindingForm({ ...findingForm, description: e.target.value })} required />
            </div>
            <DialogFooter className="pt-2">
              <Button type="submit" disabled={createFindingMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                Log Gap & Issue
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
