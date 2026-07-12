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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Flame, 
  Plus, 
  Trash2, 
  Calendar, 
  FileSpreadsheet, 
  AlertTriangle,
  Loader2,
  Filter
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function CarbonTrackingPage() {
  const { activeRole } = useAuthStore();
  const { departments } = useOrgStore();
  const queryClient = useQueryClient();

  // Local state for filters and form
  const [selectedDept, setSelectedDept] = React.useState<string>('all');
  const [selectedSource, setSelectedSource] = React.useState<string>('all');
  const [isOpen, setIsOpen] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  // Form Field States
  const [txForm, setTxForm] = React.useState({
    departmentId: '',
    emissionFactorId: '',
    quantity: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // 1. Fetch Carbon Transactions via TanStack Query
  const { data: transactions = [], isLoading: isTxLoading } = useQuery<any[]>({
    queryKey: ['carbon-transactions', selectedDept, selectedSource],
    queryFn: async () => {
      const url = new URL('/api/environmental/carbon', window.location.origin);
      if (selectedDept !== 'all') url.searchParams.append('departmentId', selectedDept);
      if (selectedSource !== 'all') url.searchParams.append('sourceType', selectedSource);

      const res = await fetch(url.toString(), {
        headers: { 'x-user-role': activeRole }
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      return res.json();
    }
  });

  // 2. Fetch Emission Factors via TanStack Query (to populate form)
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

  // 3. Create Carbon Transaction Mutation
  const createTxMutation = useMutation({
    mutationFn: async (newTx: any) => {
      const res = await fetch('/api/environmental/carbon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': activeRole
        },
        body: JSON.stringify(newTx),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to log carbon transaction');
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate queries to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['carbon-transactions'] });
      
      // Clear form & close modal
      setTxForm({
        departmentId: '',
        emissionFactorId: '',
        quantity: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
      setFormError(null);
      setIsOpen(false);

      // Trigger celebration
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    },
    onError: (err: any) => {
      setFormError(err.message);
    }
  });

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.departmentId || !txForm.emissionFactorId || !txForm.quantity) {
      setFormError('Please fill out all required fields.');
      return;
    }
    createTxMutation.mutate(txForm);
  };

  const isEmployee = activeRole === 'Employee';

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/50 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
            Scope Carbon Transaction Logs
            <Flame className="h-5 w-5 text-orange-600" />
          </h1>
          <p className="text-sm text-[#72796d]">
            Log, filter, and audit resource consumption ledger items with automated carbon equivalence calculations.
          </p>
        </div>
        {!isEmployee && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow-sm" />}>
              <Plus className="h-4 w-4" /> Log Transaction
            </DialogTrigger>
            <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
              <DialogHeader>
                <DialogTitle className="text-[#003a03]">Log Carbon Transaction</DialogTitle>
                <DialogDescription>Add a new resource consumption entry. Carbon equivalents are automatically computed server-side.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleLogSubmit} className="space-y-4 py-2 text-xs">
                {formError && (
                  <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                {/* Department Selection */}
                <div className="space-y-1">
                  <Label htmlFor="tx-dept">Department Unit</Label>
                  <Select value={txForm.departmentId} onValueChange={(val) => setTxForm({ ...txForm, departmentId: val || '' })}>
                    <SelectTrigger id="tx-dept" className="bg-white">
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Coefficient Selection */}
                <div className="space-y-1">
                  <Label htmlFor="tx-factor">Emission Factor / Coefficient</Label>
                  <Select value={txForm.emissionFactorId} onValueChange={(val) => setTxForm({ ...txForm, emissionFactorId: val || '' })}>
                    <SelectTrigger id="tx-factor" className="bg-white">
                      <SelectValue placeholder="Select Emission Factor" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {factors.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name} ({f.unit}) - {f.category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Quantity input */}
                <div className="space-y-1">
                  <Label htmlFor="tx-qty">Quantity Consumed</Label>
                  <Input id="tx-qty" type="number" step="0.01" placeholder="e.g. 1250" value={txForm.quantity} onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })} required />
                </div>
                {/* Date Selection */}
                <div className="space-y-1">
                  <Label htmlFor="tx-date">Date of Consumption</Label>
                  <Input id="tx-date" type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} required />
                </div>
                {/* Notes */}
                <div className="space-y-1">
                  <Label htmlFor="tx-notes">Description / Notes</Label>
                  <Input id="tx-notes" placeholder="e.g. Q2 warehouse energy logs" value={txForm.notes} onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })} />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={createTxMutation.isPending} className="bg-[#003a03] hover:bg-[#2e6b27] text-white">
                    {createTxMutation.isPending ? 'Calculating...' : 'Save Transaction'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter and List Panel */}
      <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e3cb]/30 pb-4">
          <div>
            <CardTitle className="text-sm font-bold text-[#003a03]">Operational Transactions Ledger</CardTitle>
            <CardDescription className="text-xs text-[#72796d]">
              Auditable operational registry.
            </CardDescription>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-[#72796d]" />
            <Select value={selectedDept} onValueChange={(val) => setSelectedDept(val || 'all')}>
              <SelectTrigger className="h-8.5 w-40 bg-white text-xs border-[#e8e3cb]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent className="bg-white text-xs">
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedSource} onValueChange={(val) => setSelectedSource(val || 'all')}>
              <SelectTrigger className="h-8.5 w-40 bg-white text-xs border-[#e8e3cb]">
                <SelectValue placeholder="All Source Types" />
              </SelectTrigger>
              <SelectContent className="bg-white text-xs">
                <SelectItem value="all">All Source Types</SelectItem>
                <SelectItem value="Purchase">Purchase (Scope 2)</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing (Scope 3)</SelectItem>
                <SelectItem value="Expense">Expense (Scope 3 Travel)</SelectItem>
                <SelectItem value="Fleet">Fleet (Scope 1)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isTxLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#2e6b27]" />
              <p className="text-xs text-[#72796d]">Querying ledger records...</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center text-center p-4">
              <Calendar className="h-8 w-8 text-[#b2ad81] mb-2" />
              <p className="text-xs text-[#72796d] font-bold">No transactions found</p>
              <p className="text-[10px] text-[#72796d]/85">Try adjusting your filters or log a new transaction.</p>
            </div>
          ) : (
            <Table className="text-xs">
              <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb] text-[#72796d] font-bold">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Emission Factor</TableHead>
                  <TableHead>Source Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Carbon (kg CO2e)</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="border-b border-[#e8e3cb]/20 hover:bg-[#fff9e6]/10">
                    <TableCell className="font-mono">
                      {new Date(tx.date).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}
                    </TableCell>
                    <TableCell className="font-bold text-[#003a03]">
                      {tx.department?.code || 'N/A'}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-800">
                      {tx.emissionFactor?.name || 'Deleted Coefficient'}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-700 bg-slate-100 border border-slate-200/50 px-2 py-0.5 rounded text-[10px]">
                        {tx.sourceType}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {tx.quantity.toLocaleString()} {tx.emissionFactor?.unit || ''}
                    </TableCell>
                    <TableCell className="text-right font-mono font-bold text-rose-700">
                      {Math.round(tx.totalEmissions).toLocaleString()} kg
                    </TableCell>
                    <TableCell className="text-[#72796d] truncate max-w-[200px]" title={tx.notes || ''}>
                      {tx.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
