'use client';

import { useState, useEffect } from 'react';
import { ReportPreview } from '@/components/reports/report-preview';
import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/export-utils';
import { Download, FileText, FileSpreadsheet, Loader2, Save, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('environmental');
  const [departmentId, setDepartmentId] = useState('');
  const [includeSummary, setIncludeSummary] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState(false);

  const [savedReports, setSavedReports] = useState<any[]>([]);

  useEffect(() => {
    fetchSavedReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    generateReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, departmentId, includeSummary]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('type', reportType);
      if (departmentId) params.append('departmentId', departmentId);
      if (includeSummary) params.append('includeSummary', 'true');

      const res = await fetch(`/api/reports?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json.data);
        setSummary(json.summary);
        setSummaryError(json.summaryError || false);
      }
    } catch (error) {
      console.error('Failed to fetch report', error);
    }
    setLoading(false);
  };

  const fetchSavedReports = async () => {
    try {
      const res = await fetch('/api/reports/saved');
      const json = await res.json();
      if (json.success) {
        setSavedReports(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveReport = async () => {
    const name = prompt('Enter a name for this report configuration:');
    if (!name) return;
    try {
      const res = await fetch('/api/reports/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          config: { type: reportType, departmentId, includeSummary }
        })
      });
      if (res.ok) {
        fetchSavedReports();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSavedReport = (config: any) => {
    setReportType(config.type || 'environmental');
    setDepartmentId(config.departmentId || '');
    setIncludeSummary(config.includeSummary ?? true);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center no-print">
        <h1 className="text-3xl font-bold">Report Builder</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={saveReport}>
            <Save className="w-4 h-4 mr-2" /> Save Config
          </Button>
          <div className="relative group">
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" /> Load
            </Button>
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border rounded-md shadow-xl hidden group-hover:block z-50 overflow-hidden">
              {savedReports.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No saved reports</div>
              ) : (
                savedReports.map(sr => (
                  <button 
                    key={sr.id}
                    onClick={() => loadSavedReport(sr.config)}
                    className="block w-full text-left px-4 py-3 hover:bg-slate-50 text-sm border-b last:border-0"
                  >
                    <div className="font-medium text-slate-900">{sr.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(sr.createdAt).toLocaleDateString()}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="col-span-1 space-y-6 no-print bg-white p-6 rounded-xl border shadow-sm h-fit">
          <h2 className="font-semibold text-lg border-b pb-2">Filters</h2>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Report Type</label>
            <select 
              className="w-full p-2.5 border rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option value="environmental">Environmental</option>
              <option value="social">Social</option>
              <option value="governance">Governance</option>
              <option value="esg_summary">ESG Summary</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Department</label>
            <select 
              className="w-full p-2.5 border rounded-md bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">All Departments</option>
              <option value="dept-ops">Operations</option>
              <option value="dept-esg">ESG & Sustainability</option>
              <option value="dept-hr">Human Resources</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="includeSummary"
              checked={includeSummary}
              onChange={(e) => setIncludeSummary(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="includeSummary" className="text-sm font-medium cursor-pointer">Include AI Summary</label>
          </div>

          <div className="pt-6 border-t space-y-3">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Export As</h3>
            <Button 
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700" 
              onClick={() => exportToPDF('report-preview-container', `${reportType}-report`)}
              disabled={loading}
            >
              <FileText className="w-4 h-4" /> PDF Document
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-300" 
                onClick={() => exportToExcel(reportData?.carbonTransactions || [], `${reportType}-report`)}
                disabled={loading}
              >
                <FileSpreadsheet className="w-4 h-4" /> Excel
              </Button>
              <Button 
                variant="outline"
                className="w-full flex items-center justify-center gap-2 border-slate-300" 
                onClick={() => exportToCSV(reportData?.carbonTransactions || [], `${reportType}-report`)}
                disabled={loading}
              >
                <Download className="w-4 h-4" /> CSV
              </Button>
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">Data exports contain full transactional records</p>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-3">
          <div className="bg-slate-100/50 border rounded-xl overflow-hidden p-8 flex justify-center min-h-[500px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p>Generating {includeSummary ? 'AI Summary and Report' : 'Report'}...</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <div className="shadow-2xl">
                  <ReportPreview 
                    data={reportData} 
                    summary={summary} 
                    summaryError={summaryError}
                    reportType={reportType}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
