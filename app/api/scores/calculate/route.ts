import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb, fallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  try {
    const period = new Date().toISOString().substring(0, 7);
    const depts = isOnline 
      ? await prisma.department.findMany() 
      : getFallbackDb().departments;

    const targets = departmentId ? depts.filter((d: any) => d.id === departmentId) : depts;
    const results = [];

    for (const d of targets) {
      const res = await updateScorePipeline(d.id, isOnline, period);
      results.push(res);
    }

    return NextResponse.json({
      period,
      recalculated: results.length,
      departments: results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    const period = new Date().toISOString().substring(0, 7);
    const depts = isOnline 
      ? await prisma.department.findMany() 
      : getFallbackDb().departments;

    const results = [];
    for (const d of depts) {
      const res = await updateScorePipeline(d.id, isOnline, period);
      results.push(res);
    }

    return NextResponse.json({
      success: true,
      period,
      recalculated: results.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function computeTrend(current: number, baseline: number, inverseGood: boolean = false): string {
  if (current === baseline) return 'stable';
  if (current > baseline) return inverseGood ? 'down' : 'up'; // If inverseGood (e.g. emissions), higher is worse, so trend 'down' meaning bad trend? Wait, trend is visual. Let's use 'up' for increase, 'down' for decrease. 
  return 'down';
}

function computeTrendVisual(current: number, baseline: number): string {
  if (Math.abs(current - baseline) < 0.01) return 'stable';
  return current > baseline ? 'up' : 'down';
}

// Full Score recalculation logic matching user spec
export async function updateScorePipeline(departmentId: string, isOnline: boolean, period: string = new Date().toISOString().substring(0, 7)) {
  let carbonTotal = 0;
  let environmentalScore = 100;
  let socialScore = 100;
  let governanceScore = 100;
  let targetBaseline = 10000;

  const breakdowns = [];
  const getPrevPeriod = (p: string) => {
    const [y, m] = p.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 2); // -1 for 0-indexed, -1 for prev month
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };
  const prevPeriod = getPrevPeriod(period);

  if (isOnline) {
    const prevScore = await prisma.departmentScore.findFirst({
      where: { departmentId, period: prevPeriod },
      include: { breakdowns: true }
    });

    const getPrevMetric = (name: string, fallback: number) => {
      if (!prevScore) return fallback;
      const bd = prevScore.breakdowns.find((b: any) => b.metricName === name);
      return bd ? bd.metricValue : fallback;
    };

    // --- ENVIRONMENT ---
    const transactions = await prisma.carbonTransaction.findMany({ where: { departmentId } });
    carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

    const goals = await prisma.goal.findMany({ where: { departmentId, status: 'Active' } });
    if (goals.length > 0) {
      targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
    }
    const envRatio = carbonTotal / targetBaseline;
    const envDeduction = envRatio * 100;
    environmentalScore = Math.max(0, Math.min(100, 100 - envDeduction));

    breakdowns.push({
      category: 'environmental',
      metricName: 'carbon_vs_goal',
      metricValue: envRatio,
      baselineValue: getPrevMetric('carbon_vs_goal', envRatio),
      impactPoints: -envDeduction,
      weight: 1.0,
      trend: computeTrendVisual(envRatio, getPrevMetric('carbon_vs_goal', envRatio)),
      sourceTable: 'CarbonTransaction',
      sourceIds: transactions.map(t => t.id),
      sourceUrl: `/environmental/carbon?department=${departmentId}`,
      period
    });

    // --- SOCIAL ---
    const employees = await prisma.employee.findMany({ where: { departmentId } });
    const totalEmployees = employees.length;

    let csrParticipationRate = 0;
    let parts: any[] = [];
    if (totalEmployees > 0) {
      parts = await prisma.employeeParticipation.findMany({
        where: {
          employee: { departmentId },
          approvalStatus: 'Approved',
        },
        distinct: ['employeeId'],
      });
      csrParticipationRate = (parts.length / totalEmployees) * 100;
    }
    
    let challengeCompletionRate = 100;
    let chalParticipations: any[] = [];
    if (totalEmployees > 0) {
      chalParticipations = await prisma.challengeParticipation.findMany({
        where: {
          employee: { departmentId },
        },
      });
      const totalChallenges = chalParticipations.length;
      const completedChallenges = chalParticipations.filter(p => p.approvalStatus === 'Approved').length;
      challengeCompletionRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 100;
    }
    socialScore = (csrParticipationRate * 0.6) + (challengeCompletionRate * 0.4);

    breakdowns.push({
      category: 'social',
      metricName: 'csr_participation_rate',
      metricValue: csrParticipationRate,
      baselineValue: getPrevMetric('csr_participation_rate', csrParticipationRate),
      impactPoints: csrParticipationRate * 0.6,
      weight: 0.6,
      trend: computeTrendVisual(csrParticipationRate, getPrevMetric('csr_participation_rate', csrParticipationRate)),
      sourceTable: 'EmployeeParticipation',
      sourceIds: parts.map(p => p.id),
      sourceUrl: `/social/csr?department=${departmentId}&status=Approved`,
      period
    });

    breakdowns.push({
      category: 'social',
      metricName: 'challenge_completion_rate',
      metricValue: challengeCompletionRate,
      baselineValue: getPrevMetric('challenge_completion_rate', challengeCompletionRate),
      impactPoints: challengeCompletionRate * 0.4,
      weight: 0.4,
      trend: computeTrendVisual(challengeCompletionRate, getPrevMetric('challenge_completion_rate', challengeCompletionRate)),
      sourceTable: 'ChallengeParticipation',
      sourceIds: chalParticipations.map(p => p.id),
      sourceUrl: `/gamification/challenges?department=${departmentId}&status=Approved`,
      period
    });

    // --- GOVERNANCE ---
    const policyAcks = await prisma.policyAcknowledgement.findMany({
      where: { employee: { departmentId } },
    });
    const totalAcks = policyAcks.length;
    const acked = policyAcks.filter(p => p.status === 'Acknowledged').length;
    const acknowledgementRate = totalAcks > 0 ? (acked / totalAcks) * 100 : 100;

    const audits = await prisma.audit.findMany({ where: { departmentId, status: 'Completed' } });
    const auditScores = audits.filter(a => a.score !== null).map(a => a.score as number);
    const auditAverage = auditScores.length > 0 ? auditScores.reduce((sum, s) => sum + s, 0) / auditScores.length : 100;

    const complianceIssues = await prisma.complianceIssue.findMany({
      where: {
        audit: { departmentId },
        status: 'Open',
        severity: { in: ['High', 'Critical'] },
      },
    });
    const penalty = complianceIssues.length * 5;
    governanceScore = Math.max(0, (acknowledgementRate * 0.4) + (auditAverage * 0.6) - penalty);

    breakdowns.push({
      category: 'governance',
      metricName: 'policy_acknowledgement_rate',
      metricValue: acknowledgementRate,
      baselineValue: getPrevMetric('policy_acknowledgement_rate', acknowledgementRate),
      impactPoints: acknowledgementRate * 0.4,
      weight: 0.4,
      trend: computeTrendVisual(acknowledgementRate, getPrevMetric('policy_acknowledgement_rate', acknowledgementRate)),
      sourceTable: 'PolicyAcknowledgement',
      sourceIds: policyAcks.map(p => p.id),
      sourceUrl: `/governance/policies?department=${departmentId}`,
      period
    });

    breakdowns.push({
      category: 'governance',
      metricName: 'audit_average',
      metricValue: auditAverage,
      baselineValue: getPrevMetric('audit_average', auditAverage),
      impactPoints: auditAverage * 0.6,
      weight: 0.6,
      trend: computeTrendVisual(auditAverage, getPrevMetric('audit_average', auditAverage)),
      sourceTable: 'Audit',
      sourceIds: audits.map(a => a.id),
      sourceUrl: `/governance/audits?department=${departmentId}`,
      period
    });

    if (penalty > 0) {
      breakdowns.push({
        category: 'governance',
        metricName: 'compliance_penalty',
        metricValue: penalty,
        baselineValue: getPrevMetric('compliance_penalty', penalty),
        impactPoints: -penalty,
        weight: 0.0,
        trend: computeTrendVisual(penalty, getPrevMetric('compliance_penalty', penalty)),
        sourceTable: 'ComplianceIssue',
        sourceIds: complianceIssues.map(c => c.id),
        sourceUrl: `/governance/compliance?department=${departmentId}`,
        period
      });
    }

    const totalScore = (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3);

    const existingScore = await prisma.departmentScore.findFirst({
      where: { departmentId, period },
    });

    let scoreId = "";
    if (existingScore) {
      scoreId = existingScore.id;
      await prisma.departmentScore.update({
        where: { id: existingScore.id },
        data: { carbonTotal, environmentalScore, socialScore, governanceScore, totalScore },
      });
      // Delete old breakdowns
      await prisma.scoreBreakdown.deleteMany({
        where: { departmentScoreId: scoreId }
      });
    } else {
      const newScore = await prisma.departmentScore.create({
        data: { departmentId, period, environmentalScore, socialScore, governanceScore, totalScore, carbonTotal },
      });
      scoreId = newScore.id;
    }

    // Insert new breakdowns
    await prisma.scoreBreakdown.createMany({
      data: breakdowns.map(b => ({ ...b, departmentScoreId: scoreId }))
    });

    return { departmentId, environmentalScore, socialScore, governanceScore, totalScore };
  } else {
    const db = getFallbackDb();
    
    const prevScoreIndex = db.departmentScores.findIndex(
      (s: any) => s.departmentId === departmentId && s.period === prevPeriod
    );
    const prevScoreId = prevScoreIndex >= 0 ? db.departmentScores[prevScoreIndex].id : null;
    const prevBreakdowns = prevScoreId ? (db.scoreBreakdowns || []).filter((b: any) => b.departmentScoreId === prevScoreId) : [];
    
    const getPrevMetric = (name: string, fallback: number) => {
      const bd = prevBreakdowns.find((b: any) => b.metricName === name);
      return bd ? bd.metricValue : fallback;
    };
    
    const transactions = db.carbonTransactions.filter((t: any) => t.departmentId === departmentId);
    carbonTotal = transactions.reduce((sum: number, t: any) => sum + t.totalEmissions, 0);

    const goals = db.goals.filter((g: any) => g.departmentId === departmentId && g.status === 'Active');
    if (goals.length > 0) {
      targetBaseline = goals.reduce((sum: number, g: any) => sum + g.targetValue, 0);
    }
    const envRatio = carbonTotal / targetBaseline;
    const envDeduction = envRatio * 100;
    environmentalScore = Math.max(0, Math.min(100, 100 - envDeduction));
    
    breakdowns.push({
      id: `bd-${Math.random().toString(36).substr(2, 9)}`,
      category: 'environmental',
      metricName: 'carbon_vs_goal',
      metricValue: envRatio,
      baselineValue: getPrevMetric('carbon_vs_goal', envRatio),
      impactPoints: -envDeduction,
      weight: 1.0,
      trend: computeTrendVisual(envRatio, getPrevMetric('carbon_vs_goal', envRatio)),
      sourceTable: 'CarbonTransaction',
      sourceIds: transactions.map((t: any) => t.id),
      sourceUrl: `/environmental/carbon?department=${departmentId}`,
      period
    });

    const employees = db.employees.filter((e: any) => e.departmentId === departmentId);
    const totalEmployees = employees.length;

    let csrParticipationRate = 0;
    let parts = [];
    if (totalEmployees > 0) {
      parts = db.employeeParticipations.filter(
        (p: any) => {
          const emp = db.employees.find((e: any) => e.id === p.employeeId);
          return emp?.departmentId === departmentId && p.approvalStatus === 'Approved';
        }
      );
      const uniqueEmpIds = Array.from(new Set(parts.map((p: any) => p.employeeId)));
      csrParticipationRate = (uniqueEmpIds.length / totalEmployees) * 100;
    }
    
    let challengeCompletionRate = 100;
    let chalParticipations: any[] = [];
    if (totalEmployees > 0) {
      chalParticipations = db.challengeParticipations.filter((p: any) => {
        const emp = db.employees.find((e: any) => e.id === p.employeeId);
        return emp?.departmentId === departmentId;
      });
      const totalChallenges = chalParticipations.length;
      const completedChallenges = chalParticipations.filter((p: any) => p.approvalStatus === 'Approved').length;
      challengeCompletionRate = totalChallenges > 0 ? (completedChallenges / totalChallenges) * 100 : 100;
    }
    socialScore = (csrParticipationRate * 0.6) + (challengeCompletionRate * 0.4);
    
    breakdowns.push({
      id: `bd-${Math.random().toString(36).substr(2, 9)}`,
      category: 'social',
      metricName: 'csr_participation_rate',
      metricValue: csrParticipationRate,
      baselineValue: getPrevMetric('csr_participation_rate', csrParticipationRate),
      impactPoints: csrParticipationRate * 0.6,
      weight: 0.6,
      trend: computeTrendVisual(csrParticipationRate, getPrevMetric('csr_participation_rate', csrParticipationRate)),
      sourceTable: 'EmployeeParticipation',
      sourceIds: parts.map((p: any) => p.id),
      sourceUrl: `/social/csr?department=${departmentId}&status=Approved`,
      period
    });

    breakdowns.push({
      id: `bd-${Math.random().toString(36).substr(2, 9)}`,
      category: 'social',
      metricName: 'challenge_completion_rate',
      metricValue: challengeCompletionRate,
      baselineValue: getPrevMetric('challenge_completion_rate', challengeCompletionRate),
      impactPoints: challengeCompletionRate * 0.4,
      weight: 0.4,
      trend: computeTrendVisual(challengeCompletionRate, getPrevMetric('challenge_completion_rate', challengeCompletionRate)),
      sourceTable: 'ChallengeParticipation',
      sourceIds: chalParticipations.map((p: any) => p.id),
      sourceUrl: `/gamification/challenges?department=${departmentId}&status=Approved`,
      period
    });

    let policyAcks: any[] = [];
    policyAcks = db.policyAcknowledgements.filter(
      (p: any) => {
        const emp = db.employees.find((e: any) => e.id === p.employeeId);
        return emp?.departmentId === departmentId;
      }
    );
    const totalAcks = policyAcks.length;
    const acked = policyAcks.filter((p: any) => p.status === 'Acknowledged').length;
    const acknowledgementRate = totalAcks > 0 ? (acked / totalAcks) * 100 : 100;

    const audits = db.audits.filter((a: any) => a.departmentId === departmentId && a.status === 'Completed');
    const auditScores = audits.filter((a: any) => a.score !== null && a.score !== undefined).map((a: any) => a.score);
    const auditAverage = auditScores.length > 0 ? auditScores.reduce((sum: number, s: number) => sum + s, 0) / auditScores.length : 100;

    const complianceIssues = db.complianceIssues.filter((iss: any) => {
      const audit = db.audits.find((a: any) => a.id === iss.auditId);
      return audit?.departmentId === departmentId && iss.status === 'Open' && ['High', 'Critical'].includes(iss.severity);
    });
    const penalty = complianceIssues.length * 5;
    governanceScore = Math.max(0, (acknowledgementRate * 0.4) + (auditAverage * 0.6) - penalty);

    breakdowns.push({
      id: `bd-${Math.random().toString(36).substr(2, 9)}`,
      category: 'governance',
      metricName: 'policy_acknowledgement_rate',
      metricValue: acknowledgementRate,
      baselineValue: getPrevMetric('policy_acknowledgement_rate', acknowledgementRate),
      impactPoints: acknowledgementRate * 0.4,
      weight: 0.4,
      trend: computeTrendVisual(acknowledgementRate, getPrevMetric('policy_acknowledgement_rate', acknowledgementRate)),
      sourceTable: 'PolicyAcknowledgement',
      sourceIds: policyAcks.map((p: any) => p.id),
      sourceUrl: `/governance/policies?department=${departmentId}`,
      period
    });

    breakdowns.push({
      id: `bd-${Math.random().toString(36).substr(2, 9)}`,
      category: 'governance',
      metricName: 'audit_average',
      metricValue: auditAverage,
      baselineValue: getPrevMetric('audit_average', auditAverage),
      impactPoints: auditAverage * 0.6,
      weight: 0.6,
      trend: computeTrendVisual(auditAverage, getPrevMetric('audit_average', auditAverage)),
      sourceTable: 'Audit',
      sourceIds: audits.map((a: any) => a.id),
      sourceUrl: `/governance/audits?department=${departmentId}`,
      period
    });

    if (penalty > 0) {
      breakdowns.push({
        id: `bd-${Math.random().toString(36).substr(2, 9)}`,
        category: 'governance',
        metricName: 'compliance_penalty',
        metricValue: penalty,
        baselineValue: getPrevMetric('compliance_penalty', penalty),
        impactPoints: -penalty,
        weight: 0.0,
        trend: computeTrendVisual(penalty, getPrevMetric('compliance_penalty', penalty)),
        sourceTable: 'ComplianceIssue',
        sourceIds: complianceIssues.map((c: any) => c.id),
        sourceUrl: `/governance/compliance?department=${departmentId}`,
        period
      });
    }

    const totalScore = (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3);

    const scoreIndex = db.departmentScores.findIndex(
      (s: any) => s.departmentId === departmentId && s.period === period
    );

    let scoreId = "";
    const scoreData = {
      departmentId,
      period,
      environmentalScore,
      socialScore,
      governanceScore,
      totalScore,
      carbonTotal,
      createdAt: new Date().toISOString()
    };

    if (scoreIndex >= 0) {
      scoreId = db.departmentScores[scoreIndex].id;
      db.departmentScores[scoreIndex] = { ...db.departmentScores[scoreIndex], ...scoreData };
    } else {
      scoreId = `ds-${Math.random().toString(36).substr(2, 9)}`;
      db.departmentScores.push({ id: scoreId, ...scoreData });
    }

    saveFallbackDb(db);
    
    // Save breakdowns
    fallbackDb.saveScoreBreakdowns(breakdowns.map(b => ({ ...b, departmentScoreId: scoreId })));

    return scoreData;
  }
}
