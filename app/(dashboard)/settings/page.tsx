'use client';

import React from 'react';
import { useConfigStore } from '@/stores/use-config-store';
import { useOrgStore } from '@/stores/use-org-store';
import { useSocialStore } from '@/stores/use-social-store';
import { useEnvironmentalStore } from '@/stores/use-environmental-store';
import { useGamificationStore } from '@/stores/use-gamification-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings, 
  Network, 
  Tags, 
  Flame, 
  Award, 
  Gift, 
  Plus, 
  Trash2, 
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  // Config Store
  const { config, updateConfig } = useConfigStore();
  
  // Org Store
  const { departments, addDepartment, deleteDepartment } = useOrgStore();
  
  // Social Store (Categories)
  const { categories, addCategory, deleteCategory } = useSocialStore();
  
  // Environmental Store (Factors)
  const { emissionFactors, addEmissionFactor, deleteEmissionFactor } = useEnvironmentalStore();
  
  // Gamification Store (Badges & Rewards)
  const { badges, addBadge, rewards, addReward, deleteReward } = useGamificationStore();

  // Local state for modals/forms
  const [activeTab, setActiveTab] = React.useState('config');
  
  // Form States
  const [deptForm, setDeptForm] = React.useState({ name: '', code: '', head: '', parentId: '' });
  const [catForm, setCatForm] = React.useState({ name: '', type: 'CSR_Activity' as any });
  const [factorForm, setFactorForm] = React.useState({ name: '', category: 'Purchase' as any, unit: '', factorValue: 0.1, description: '' });
  const [badgeForm, setBadgeForm] = React.useState({ name: '', description: '', ruleType: 'xp_threshold' as any, ruleVal: 100, xpBonus: 50 });
  const [rewardForm, setRewardForm] = React.useState({ name: '', description: '', pointsRequired: 100, stock: 10 });

  // Dialog open states
  const [isDeptOpen, setIsDeptOpen] = React.useState(false);
  const [isCatOpen, setIsCatOpen] = React.useState(false);
  const [isFactorOpen, setIsFactorOpen] = React.useState(false);
  const [isBadgeOpen, setIsBadgeOpen] = React.useState(false);
  const [isRewardOpen, setIsRewardOpen] = React.useState(false);

  // ESG Sliders logic
  const handleSliderChange = (type: 'env' | 'soc' | 'gov', value: any) => {
    const numVal = Array.isArray(value) ? value[0] : value;
    const val = numVal / 100;
    if (type === 'env') {
      // Keep within 0 and 1. Adjust others proportionally
      const diff = val - config.envWeight;
      const otherSum = config.socialWeight + config.govWeight;
      if (otherSum > 0) {
        updateConfig({
          envWeight: val,
          socialWeight: Math.max(0, config.socialWeight - diff * (config.socialWeight / otherSum)),
          govWeight: Math.max(0, config.govWeight - diff * (config.govWeight / otherSum)),
        });
      } else {
        updateConfig({ envWeight: val, socialWeight: (1 - val) / 2, govWeight: (1 - val) / 2 });
      }
    } else if (type === 'soc') {
      const diff = val - config.socialWeight;
      const otherSum = config.envWeight + config.govWeight;
      if (otherSum > 0) {
        updateConfig({
          socialWeight: val,
          envWeight: Math.max(0, config.envWeight - diff * (config.envWeight / otherSum)),
          govWeight: Math.max(0, config.govWeight - diff * (config.govWeight / otherSum)),
        });
      } else {
        updateConfig({ socialWeight: val, envWeight: (1 - val) / 2, govWeight: (1 - val) / 2 });
      }
    } else {
      const diff = val - config.govWeight;
      const otherSum = config.envWeight + config.socialWeight;
      if (otherSum > 0) {
        updateConfig({
          govWeight: val,
          envWeight: Math.max(0, config.envWeight - diff * (config.envWeight / otherSum)),
          socialWeight: Math.max(0, config.socialWeight - diff * (config.socialWeight / otherSum)),
        });
      } else {
        updateConfig({ govWeight: val, envWeight: (1 - val) / 2, socialWeight: (1 - val) / 2 });
      }
    }
  };

  const weightsTotal = Math.round((config.envWeight + config.socialWeight + config.govWeight) * 100);

  // Form Submits
  const submitDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name || !deptForm.code || !deptForm.head) return;
    addDepartment({
      name: deptForm.name,
      code: deptForm.code.toUpperCase(),
      head: deptForm.head,
      parentId: deptForm.parentId || null,
      status: 'Active',
    });
    setDeptForm({ name: '', code: '', head: '', parentId: '' });
    setIsDeptOpen(false);
  };

  const submitCat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name) return;
    addCategory({
      name: catForm.name,
      type: catForm.type,
      status: 'Active',
    });
    setCatForm({ name: '', type: 'CSR_Activity' });
    setIsCatOpen(false);
  };

  const submitFactor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorForm.name || !factorForm.unit) return;
    addEmissionFactor({
      name: factorForm.name,
      category: factorForm.category,
      unit: factorForm.unit,
      factorValue: Number(factorForm.factorValue),
      description: factorForm.description || null,
      status: 'Active',
    });
    setFactorForm({ name: '', category: 'Purchase', unit: '', factorValue: 0.1, description: '' });
    setIsFactorOpen(false);
  };

  const submitBadge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeForm.name || !badgeForm.description) return;
    addBadge({
      name: badgeForm.name,
      description: badgeForm.description,
      unlockRule: {
        type: badgeForm.ruleType,
        value: Number(badgeForm.ruleVal),
      },
      icon: 'Award',
      xpBonus: Number(badgeForm.xpBonus),
    });
    setBadgeForm({ name: '', description: '', ruleType: 'xp_threshold', ruleVal: 100, xpBonus: 50 });
    setIsBadgeOpen(false);
  };

  const submitReward = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardForm.name || !rewardForm.description) return;
    addReward({
      name: rewardForm.name,
      description: rewardForm.description,
      pointsRequired: Number(rewardForm.pointsRequired),
      stock: Number(rewardForm.stock),
      status: 'Active',
    });
    setRewardForm({ name: '', description: '', pointsRequired: 100, stock: 10 });
    setIsRewardOpen(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div className="border-b border-[#e8e3cb]/50 pb-6">
        <h1 className="text-2xl font-extrabold text-[#003a03] font-headline-lg flex items-center gap-2">
          Platform Settings & Configurations
          <Settings className="h-5 w-5 text-[#63603a]" />
        </h1>
        <p className="text-sm text-[#72796d]">
          Manage organizational scores, weights parameters, notifications, and core master data entities.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-[#f4eedb] border border-[#e8e3cb] p-1 rounded-xl text-slate-800 flex flex-wrap max-w-max">
          <TabsTrigger value="config" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Settings className="h-3.5 w-3.5 mr-1" /> ESG Configuration
          </TabsTrigger>
          <TabsTrigger value="departments" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Network className="h-3.5 w-3.5 mr-1" /> Departments
          </TabsTrigger>
          <TabsTrigger value="categories" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Tags className="h-3.5 w-3.5 mr-1" /> Categories
          </TabsTrigger>
          <TabsTrigger value="factors" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Flame className="h-3.5 w-3.5 mr-1" /> Emission Factors
          </TabsTrigger>
          <TabsTrigger value="badges" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Award className="h-3.5 w-3.5 mr-1" /> Badges
          </TabsTrigger>
          <TabsTrigger value="rewards" className="rounded-lg data-[state=active]:bg-[#003a03] data-[state=active]:text-white font-semibold text-xs py-2 px-3">
            <Gift className="h-3.5 w-3.5 mr-1" /> Rewards Catalog
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: ESG Weights & Configurations */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weight Sliders */}
            <Card className="lg:col-span-2 bg-white/60 border border-[#e8e3cb] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#003a03]">ESG Score Weights (Sum: 100%)</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure the score weights assigned to Environmental, Social, and Governance indexes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Env Weight */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#003a03]">
                    <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-[#2e6b27]" /> Environmental Weight</span>
                    <span>{Math.round(config.envWeight * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.envWeight * 100]}
                    onValueChange={(val) => handleSliderChange('env', val)}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                </div>

                {/* Social Weight */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#003a03]">
                    <span className="flex items-center gap-1"><Network className="h-3.5 w-3.5 text-[#63603a]" /> Social Weight</span>
                    <span>{Math.round(config.socialWeight * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.socialWeight * 100]}
                    onValueChange={(val) => handleSliderChange('soc', val)}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                </div>

                {/* Gov Weight */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#003a03]">
                    <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5 text-purple-600" /> Governance Weight</span>
                    <span>{Math.round(config.govWeight * 100)}%</span>
                  </div>
                  <Slider
                    value={[config.govWeight * 100]}
                    onValueChange={(val) => handleSliderChange('gov', val)}
                    max={100}
                    step={1}
                    className="py-2"
                  />
                </div>

                {weightsTotal !== 100 ? (
                  <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-lg font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Sliders mismatch: Weights sum up to {weightsTotal}%. Ensure they sum up to 100%.
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-emerald-800 bg-[#6ea663]/10 border border-[#6ea663]/25 p-3 rounded-lg font-semibold">
                    <CheckCircle className="h-4 w-4 text-[#2e6b27]" />
                    Weights successfully balanced (Sum: 100%).
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Platform Toggles */}
            <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-bold text-[#003a03]">Workflow Policy Toggles</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure system behaviors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs font-medium">
                {/* Auto Emissions */}
                <div className="flex items-center justify-between border-b border-[#e8e3cb]/30 pb-3">
                  <div>
                    <p className="font-bold text-[#003a03]">Auto Emission Calculation</p>
                    <p className="text-[10px] text-[#72796d]">Create emission records from ERP data automatically.</p>
                  </div>
                  <Switch
                    checked={config.autoEmissionCalc}
                    onCheckedChange={(val) => updateConfig({ autoEmissionCalc: val })}
                  />
                </div>

                {/* Evidence Required */}
                <div className="flex items-center justify-between border-b border-[#e8e3cb]/30 pb-3">
                  <div>
                    <p className="font-bold text-[#003a03]">Evidence Required</p>
                    <p className="text-[10px] text-[#72796d]">Mandate image/proof uploads for CSR activities approval.</p>
                  </div>
                  <Switch
                    checked={config.evidenceRequired}
                    onCheckedChange={(val) => updateConfig({ evidenceRequired: val })}
                  />
                </div>

                {/* Auto Badge Award */}
                <div className="flex items-center justify-between border-b border-[#e8e3cb]/30 pb-3">
                  <div>
                    <p className="font-bold text-[#003a03]">Auto Badge Awards</p>
                    <p className="text-[10px] text-[#72796d]">Evaluate and award badges on XP updates.</p>
                  </div>
                  <Switch
                    checked={config.autoBadgeAward}
                    onCheckedChange={(val) => updateConfig({ autoBadgeAward: val })}
                  />
                </div>

                {/* Push Notifications */}
                <div className="flex items-center justify-between border-b border-[#e8e3cb]/30 pb-3">
                  <div>
                    <p className="font-bold text-[#003a03]">Web Push Notifications</p>
                    <p className="text-[10px] text-[#72796d]">Dispatch native browser push alerts.</p>
                  </div>
                  <Switch
                    checked={config.pushNotifications}
                    onCheckedChange={(val) => updateConfig({ pushNotifications: val })}
                  />
                </div>

                {/* Email Notifications */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#003a03]">Email Dispatch</p>
                    <p className="text-[10px] text-[#72796d]">Send emails via Resend API integrations.</p>
                  </div>
                  <Switch
                    checked={config.emailNotifications}
                    onCheckedChange={(val) => updateConfig({ emailNotifications: val })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Departments CRUD */}
        <TabsContent value="departments">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#003a03]">Company Departments</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure organizational units and define manager boundaries.
                </CardDescription>
              </div>
              <Dialog open={isDeptOpen} onOpenChange={setIsDeptOpen}>
                <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1" />}>
                  <Plus className="h-3.5 w-3.5" /> Add Department
                </DialogTrigger>
                <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                  <DialogHeader>
                    <DialogTitle className="text-[#003a03]">Add Department</DialogTitle>
                    <DialogDescription>Create a new business unit in the organization structure.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitDept} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="dept-name">Name</Label>
                      <Input id="dept-name" placeholder="e.g. Research & Development" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dept-code">Department Code</Label>
                      <Input id="dept-code" placeholder="e.g. RD" value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dept-head">Manager Email</Label>
                      <Input id="dept-head" type="email" placeholder="manager@company.com" value={deptForm.head} onChange={(e) => setDeptForm({ ...deptForm, head: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dept-parent">Parent Department</Label>
                      <Select value={deptForm.parentId} onValueChange={(val) => setDeptForm({ ...deptForm, parentId: val || '' })}>
                        <SelectTrigger id="dept-parent" className="bg-white">
                          <SelectValue placeholder="No Parent Department" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="none">No Parent Department</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-[#003a03] hover:bg-[#2e6b27] text-white">Save Department</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb]">
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Head / Manager</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-bold text-[#003a03]">{dept.code}</TableCell>
                      <TableCell className="font-semibold">{dept.name}</TableCell>
                      <TableCell className="font-mono text-[#72796d]">{dept.head}</TableCell>
                      <TableCell>{dept.employeeCount}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md" onClick={() => deleteDepartment(dept.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Categories CRUD */}
        <TabsContent value="categories">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#003a03]">Activity & Challenge Categories</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure groupings for CSR events, gamification, and emissions categories.
                </CardDescription>
              </div>
              <Dialog open={isCatOpen} onOpenChange={setIsCatOpen}>
                <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1" />}>
                  <Plus className="h-3.5 w-3.5" /> Add Category
                </DialogTrigger>
                <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                  <DialogHeader>
                    <DialogTitle className="text-[#003a03]">Add Category</DialogTitle>
                    <DialogDescription>Create a taxonomy category for CSR/Challenges.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitCat} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="cat-name">Category Name</Label>
                      <Input id="cat-name" placeholder="e.g. Renewable Energy" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cat-type">Type</Label>
                      <Select value={catForm.type} onValueChange={(val) => setCatForm({ ...catForm, type: val as any })}>
                        <SelectTrigger id="cat-type" className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="CSR_Activity">CSR Activity Category</SelectItem>
                          <SelectItem value="Challenge">Challenge Category</SelectItem>
                          <SelectItem value="Emission_Category">Emission category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-[#003a03] hover:bg-[#2e6b27] text-white">Save Category</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb]">
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Module Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-semibold text-slate-800">{cat.name}</TableCell>
                      <TableCell className="font-semibold text-[#003a03]">{cat.type}</TableCell>
                      <TableCell>{cat.status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md" onClick={() => deleteCategory(cat.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Emission Factors CRUD */}
        <TabsContent value="factors">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#003a03]">Carbon Emission Factors</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure calculation coefficients (e.g. Scope 1-3 carbon equivalents).
                </CardDescription>
              </div>
              <Dialog open={isFactorOpen} onOpenChange={setIsFactorOpen}>
                <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1" />}>
                  <Plus className="h-3.5 w-3.5" /> Add Factor
                </DialogTrigger>
                <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                  <DialogHeader>
                    <DialogTitle className="text-[#003a03]">Add Emission Factor</DialogTitle>
                    <DialogDescription>Create a coefficient for carbon transaction audits.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitFactor} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="fact-name">Factor Name</Label>
                      <Input id="fact-name" placeholder="e.g. Commercial Jet Fuel" value={factorForm.name} onChange={(e) => setFactorForm({ ...factorForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fact-cat">Source Type</Label>
                      <Select value={factorForm.category} onValueChange={(val) => setFactorForm({ ...factorForm, category: val as any })}>
                        <SelectTrigger id="fact-cat" className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="Purchase">Purchase (Scope 2)</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing (Scope 3)</SelectItem>
                          <SelectItem value="Expense">Expense (Scope 3 Travel)</SelectItem>
                          <SelectItem value="Fleet">Fleet (Scope 1 Fleet)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="fact-val">Factor Value</Label>
                        <Input id="fact-val" type="number" step="0.001" placeholder="e.g. 2.68" value={factorForm.factorValue} onChange={(e) => setFactorForm({ ...factorForm, factorValue: Number(e.target.value) })} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="fact-unit">Unit</Label>
                        <Input id="fact-unit" placeholder="e.g. kg CO2/liter" value={factorForm.unit} onChange={(e) => setFactorForm({ ...factorForm, unit: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="fact-desc">Description</Label>
                      <Input id="fact-desc" placeholder="Operational details" value={factorForm.description} onChange={(e) => setFactorForm({ ...factorForm, description: e.target.value })} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-[#003a03] hover:bg-[#2e6b27] text-white">Save Factor</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb]">
                  <TableRow>
                    <TableHead>Factor Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Coefficient Value</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emissionFactors.map((fact) => (
                    <TableRow key={fact.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-semibold text-slate-800">{fact.name}</TableCell>
                      <TableCell className="font-semibold text-[#003a03]">{fact.category}</TableCell>
                      <TableCell className="font-mono">{fact.factorValue}</TableCell>
                      <TableCell>{fact.unit}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md" onClick={() => deleteEmissionFactor(fact.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Badges CRUD */}
        <TabsContent value="badges">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#003a03]">Achievement Badges</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure gamification rewards and milestones automatically triggered on accomplishments.
                </CardDescription>
              </div>
              <Dialog open={isBadgeOpen} onOpenChange={setIsBadgeOpen}>
                <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1" />}>
                  <Plus className="h-3.5 w-3.5" /> Add Badge
                </DialogTrigger>
                <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                  <DialogHeader>
                    <DialogTitle className="text-[#003a03]">Add Achievement Badge</DialogTitle>
                    <DialogDescription>Create an auto-awarded badge configuration.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitBadge} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="bdg-name">Badge Name</Label>
                      <Input id="bdg-name" placeholder="e.g. Solar Savior" value={badgeForm.name} onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bdg-desc">Description</Label>
                      <Input id="bdg-desc" placeholder="Badge unlock conditions" value={badgeForm.description} onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="bdg-rule">Rule Trigger</Label>
                        <Select value={badgeForm.ruleType} onValueChange={(val) => setBadgeForm({ ...badgeForm, ruleType: val as any })}>
                          <SelectTrigger id="bdg-rule" className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="xp_threshold">XP Threshold</SelectItem>
                            <SelectItem value="challenges_completed">Challenges Completed</SelectItem>
                            <SelectItem value="streak_days">Streak (Days)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="bdg-val">Condition Value</Label>
                        <Input id="bdg-val" type="number" placeholder="e.g. 1000" value={badgeForm.ruleVal} onChange={(e) => setBadgeForm({ ...badgeForm, ruleVal: Number(e.target.value) })} required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bdg-bonus">XP Bonus Reward</Label>
                      <Input id="bdg-bonus" type="number" placeholder="e.g. 200" value={badgeForm.xpBonus} onChange={(e) => setBadgeForm({ ...badgeForm, xpBonus: Number(e.target.value) })} required />
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-[#003a03] hover:bg-[#2e6b27] text-white">Save Badge</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb]">
                  <TableRow>
                    <TableHead>Badge Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rule trigger</TableHead>
                    <TableHead>XP Bonus</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {badges.map((bdg) => (
                    <TableRow key={bdg.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-bold text-[#003a03]">{bdg.name}</TableCell>
                      <TableCell>{bdg.description}</TableCell>
                      <TableCell className="font-semibold">
                        {bdg.unlockRule.type === 'xp_threshold' && `XP >= ${bdg.unlockRule.value}`}
                        {bdg.unlockRule.type === 'challenges_completed' && `${bdg.unlockRule.value} challenges`}
                        {bdg.unlockRule.type === 'streak_days' && `${bdg.unlockRule.value}-day interaction streak`}
                      </TableCell>
                      <TableCell className="font-bold text-[#2e6b27] font-mono">+{bdg.xpBonus} XP</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: Rewards CRUD */}
        <TabsContent value="rewards">
          <Card className="bg-white/60 border border-[#e8e3cb] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-[#003a03]">Rewards Catalog</CardTitle>
                <CardDescription className="text-xs text-[#72796d]">
                  Configure items redeemable by employees using cumulative points balance.
                </CardDescription>
              </div>
              <Dialog open={isRewardOpen} onOpenChange={setIsRewardOpen}>
                <DialogTrigger render={<Button className="h-9 bg-[#003a03] hover:bg-[#2e6b27] text-white font-semibold text-xs rounded-lg flex items-center gap-1" />}>
                  <Plus className="h-3.5 w-3.5" /> Add Reward
                </DialogTrigger>
                <DialogContent className="bg-white text-slate-800 border-[#e8e3cb]">
                  <DialogHeader>
                    <DialogTitle className="text-[#003a03]">Add Catalog Reward</DialogTitle>
                    <DialogDescription>Create a reward item for the redemption catalog.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={submitReward} className="space-y-4 py-2">
                    <div className="space-y-1">
                      <Label htmlFor="rew-name">Reward Title</Label>
                      <Input id="rew-name" placeholder="e.g. Solar Charger Pack" value={rewardForm.name} onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })} required />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="rew-desc">Description</Label>
                      <Input id="rew-desc" placeholder="Product details" value={rewardForm.description} onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="rew-points">Points Required</Label>
                        <Input id="rew-points" type="number" placeholder="200" value={rewardForm.pointsRequired} onChange={(e) => setRewardForm({ ...rewardForm, pointsRequired: Number(e.target.value) })} required />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="rew-stock">Stock Qty</Label>
                        <Input id="rew-stock" type="number" placeholder="5" value={rewardForm.stock} onChange={(e) => setRewardForm({ ...rewardForm, stock: Number(e.target.value) })} required />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" className="bg-[#003a03] hover:bg-[#2e6b27] text-white">Save Reward</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="text-xs">
                <TableHeader className="bg-[#f4eedb]/50 border-b border-[#e8e3cb]">
                  <TableRow>
                    <TableHead>Reward Item</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Stock Qty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rewards.map((rew) => (
                    <TableRow key={rew.id} className="border-b border-[#e8e3cb]/20">
                      <TableCell className="font-semibold text-slate-800">{rew.name}</TableCell>
                      <TableCell className="text-[#72796d]">{rew.description}</TableCell>
                      <TableCell className="font-bold text-[#63603a] font-mono">{rew.pointsRequired} pts</TableCell>
                      <TableCell className="font-semibold">{rew.stock}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" className="h-8 w-8 p-0 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md" onClick={() => deleteReward(rew.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
