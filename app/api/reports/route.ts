import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

// In-memory cache for demo purposes
// In production, use Redis, Vercel KV, or a persistent cache layer.
const reportCache = new Map<string, { summary: string; timestamp: number }>();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'environmental';
    const deptId = searchParams.get('departmentId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const includeSummary = searchParams.get('includeSummary') === 'true';

    let isOnline = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isOnline = true;
    } catch (e) {
      isOnline = false;
    }

    // 1. Aggregate Data from DB
    let data: any = {};
    if (isOnline) {
      if (type === 'environmental' || type === 'esg_summary') {
        const carbonWhere: any = {};
        if (deptId) carbonWhere.departmentId = deptId;
        if (startDate || endDate) {
          carbonWhere.date = {};
          if (startDate) carbonWhere.date.gte = new Date(startDate);
          if (endDate) carbonWhere.date.lte = new Date(endDate);
        }
        data.carbonTransactions = await prisma.carbonTransaction.findMany({ where: carbonWhere, include: { department: true } });
        
        const goalsWhere: any = {};
        if (deptId) goalsWhere.departmentId = deptId;
        data.goals = await prisma.goal.findMany({ where: goalsWhere, include: { department: true } });
      }
      if (type === 'social' || type === 'esg_summary') {
         data.participations = await prisma.employeeParticipation.findMany({ include: { employee: { include: { department: true } }, activity: true }});
      }
      if (type === 'governance' || type === 'esg_summary') {
         data.audits = await prisma.audit.findMany({ include: { department: true }});
         data.issues = await prisma.complianceIssue.findMany();
      }
      
      const scoresWhere: any = {};
      if (deptId) scoresWhere.departmentId = deptId;
      data.departmentScores = await prisma.departmentScore.findMany({ where: scoresWhere });
      
    } else {
      const db = getFallbackDb();
      data.carbonTransactions = db.carbonTransactions || [];
      if (deptId) data.carbonTransactions = data.carbonTransactions.filter((c:any) => c.departmentId === deptId);
      
      data.goals = db.goals || [];
      if (deptId) data.goals = data.goals.filter((g:any) => g.departmentId === deptId);

      data.participations = db.csrParticipations || [];
      data.audits = db.audits || [];
      data.issues = db.complianceIssues || [];
      
      data.departmentScores = db.departmentScores || [];
      if (deptId) data.departmentScores = data.departmentScores.filter((s:any) => s.departmentId === deptId);
    }

    // 2. Groq AI Summary
    let summary: string | null = null;
    let summaryError = false;

    if (includeSummary) {
      const cacheKey = `report:summary:${type}:${deptId || 'all'}:${startDate || 'all'}:${endDate || 'all'}`;
      const cached = reportCache.get(cacheKey);
      const oneHour = 3600 * 1000;
      
      if (cached && (Date.now() - cached.timestamp < oneHour)) {
        summary = cached.summary;
      } else {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          summary = "AI summary unavailable because GROQ_API_KEY is not configured on the server.";
          summaryError = true;
        } else {
          try {
            // Calculate some simple aggregates for the prompt
            const totalEmissions = data.carbonTransactions?.reduce((sum: number, t: any) => sum + (t.totalEmissions || 0), 0) || 0;
            const avgScore = data.departmentScores?.length 
              ? (data.departmentScores.reduce((sum: number, s: any) => sum + (s.totalScore || 0), 0) / data.departmentScores.length).toFixed(1) 
              : 0;

            const prompt = `You are a professional ESG analyst. Write a concise executive summary (1-2 paragraphs) analyzing the following corporate ${type.toUpperCase()} data. Highlight key metrics, trends, and general areas for improvement. DO NOT use markdown headers, just plain text paragraphs. Do not invent data outside what is provided.
            
            Data Summary:
            - Carbon Transactions: ${data.carbonTransactions?.length || 0}
            - Total Emissions: ${totalEmissions} kg CO2e
            - Environmental Goals Active: ${data.goals?.length || 0}
            - CSR Participations: ${data.participations?.length || 0}
            - Audits Conducted: ${data.audits?.length || 0}
            - Compliance Issues: ${data.issues?.length || 0}
            - Average Total Score: ${avgScore}
            `;

            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.3,
                max_tokens: 400
              })
            });

            if (!res.ok) {
              const errText = await res.text();
              console.error('Groq API Error:', res.status, errText);
              throw new Error(`Groq API returned ${res.status}`);
            }

            const json = await res.json();
            summary = json.choices[0]?.message?.content?.trim() || "No summary generated.";
            
            // Cache successful result
            reportCache.set(cacheKey, { summary: summary as string, timestamp: Date.now() });
          } catch (error) {
            console.error('Groq failed:', error);
            summary = "ESG AI summary temporarily unavailable. Please review the raw metrics below.";
            summaryError = true;
          }
        }
      }
    }

    return NextResponse.json({ success: true, data, summary, summaryError });
  } catch (e: any) {
    console.error('Report API error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
