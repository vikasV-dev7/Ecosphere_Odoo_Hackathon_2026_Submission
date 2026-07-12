'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ReportPreview({ data, summary, summaryError, reportType }: { data: any, summary: string | null, summaryError: boolean, reportType: string }) {
  // Process data for charts
  const chartData = data?.departmentScores?.map((ds: any) => ({
    name: ds.departmentId,
    score: ds.totalScore
  })) || [];

  return (
    <div id="report-preview-container" className="bg-white text-black p-8 shadow-sm border rounded-md max-w-[210mm] mx-auto min-h-[297mm]">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #report-preview-container, #report-preview-container * {
            visibility: visible;
          }
          #report-preview-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            box-shadow: none;
            border: none;
            padding: 20mm;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            break-after: page;
          }
        }
      `}} />
      
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">EcoSphere ESG Report</h1>
          <p className="text-slate-500 capitalize">{reportType.replace('_', ' ')} Performance</p>
        </div>
        <div className="text-right text-sm text-slate-500">
          <p>Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {summary && (
        <div className={`mb-8 p-6 rounded-lg ${summaryError ? 'bg-amber-50 border-l-4 border-amber-500' : 'bg-slate-50 border-l-4 border-blue-500'}`}>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            {summaryError ? '⚠️ AI Summary Unavailable' : '✨ Executive Summary (AI)'}
          </h2>
          <p className="text-slate-700 whitespace-pre-wrap">{summary}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-8 page-break">
        <div className="border p-4 rounded-lg bg-slate-50/50">
          <h3 className="font-semibold text-slate-600 mb-1">Total Emissions</h3>
          <p className="text-2xl font-bold text-slate-900">
            {data?.carbonTransactions?.reduce((sum: number, t: any) => sum + (t.totalEmissions || 0), 0).toLocaleString()} kg CO2e
          </p>
        </div>
        <div className="border p-4 rounded-lg bg-slate-50/50">
          <h3 className="font-semibold text-slate-600 mb-1">Average Score</h3>
          <p className="text-2xl font-bold text-slate-900">
            {data?.departmentScores?.length 
              ? (data.departmentScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0) / data.departmentScores.length).toFixed(1) 
              : 0}
          </p>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-slate-800">Department Scores</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="score" fill="#3b82f6" name="Total Score" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 border-b pb-2 text-slate-800">Raw Metrics Summary</h2>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-3 border font-semibold text-slate-700">Metric Category</th>
              <th className="p-3 border font-semibold text-slate-700">Count / Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 border text-slate-600">Carbon Transactions</td>
              <td className="p-3 border text-slate-900">{data?.carbonTransactions?.length || 0} records</td>
            </tr>
            <tr>
              <td className="p-3 border text-slate-600">Active Goals</td>
              <td className="p-3 border text-slate-900">{data?.goals?.length || 0} goals</td>
            </tr>
            <tr>
              <td className="p-3 border text-slate-600">CSR Participations</td>
              <td className="p-3 border text-slate-900">{data?.participations?.length || 0} events</td>
            </tr>
            <tr>
              <td className="p-3 border text-slate-600">Compliance Audits</td>
              <td className="p-3 border text-slate-900">{data?.audits?.length || 0} audits</td>
            </tr>
            <tr>
              <td className="p-3 border text-slate-600">Open Issues</td>
              <td className="p-3 border text-slate-900">{data?.issues?.length || 0} issues</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="text-center text-xs text-slate-400 mt-12 pt-4 border-t">
        <p>EcoSphere ESG Management Platform • Confidential Report</p>
      </div>
    </div>
  );
}
