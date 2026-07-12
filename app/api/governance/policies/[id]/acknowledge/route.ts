import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';
  const { id: policyId } = await params;

  try {
    let employeeId = '';
    let departmentId = '';
    let updatedAck: any;
    let policyTitle = '';

    if (isOnline) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }
      employeeId = employee.id;
      departmentId = employee.departmentId;

      const policy = await prisma.policy.findUnique({
        where: { id: policyId },
      });
      if (!policy) {
        return NextResponse.json({ error: 'Policy not found.' }, { status: 404 });
      }
      policyTitle = policy.title;

      const ack = await prisma.policyAcknowledgement.findFirst({
        where: { policyId, employeeId },
      });

      if (!ack) {
        return NextResponse.json({ error: 'Policy assignment not found.' }, { status: 404 });
      }

      if (ack.status === 'Acknowledged') {
        return NextResponse.json({ error: 'Policy already acknowledged.' }, { status: 400 });
      }

      // 1. Update acknowledgement
      updatedAck = await prisma.policyAcknowledgement.update({
        where: { id: ack.id },
        data: {
          status: 'Acknowledged',
          acknowledgedAt: new Date(),
        },
      });

      // 2. Award XP/Points
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          xp: { increment: 50 },
          totalPoints: { increment: 20 },
        },
      });

      // 3. Create Notification
      await prisma.notification.create({
        data: {
          employeeId,
          type: 'policy_acknowledged',
          title: 'Policy Acknowledged',
          message: `Thank you for acknowledging "${policyTitle}". You earned 50 XP and 20 pts.`,
          read: false,
        },
      });

      // 4. Recalculate Score
      await updateScorePipeline(departmentId, isOnline);

    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }
      employeeId = employee.id;
      departmentId = employee.departmentId;

      const policy = db.policies.find((p: any) => p.id === policyId);
      if (!policy) {
        return NextResponse.json({ error: 'Policy not found.' }, { status: 404 });
      }
      policyTitle = policy.title;

      const ackIndex = db.policyAcknowledgements.findIndex(
        (a: any) => a.policyId === policyId && a.employeeId === employeeId
      );

      if (ackIndex < 0) {
        return NextResponse.json({ error: 'Policy assignment not found.' }, { status: 404 });
      }

      const ack = db.policyAcknowledgements[ackIndex];
      if (ack.status === 'Acknowledged') {
        return NextResponse.json({ error: 'Policy already acknowledged.' }, { status: 400 });
      }

      // 1. Update acknowledgement
      db.policyAcknowledgements[ackIndex] = {
        ...ack,
        status: 'Acknowledged',
        acknowledgedAt: new Date().toISOString(),
      };
      updatedAck = db.policyAcknowledgements[ackIndex];

      // 2. Award XP/Points
      db.employees = db.employees.map((e: any) =>
        e.id === employeeId ? { ...e, xp: e.xp + 50, totalPoints: e.totalPoints + 20 } : e
      );

      // 3. Create Notification
      db.notifications.push({
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        type: 'policy_acknowledged',
        title: 'Policy Acknowledged',
        message: `Thank you for acknowledging "${policyTitle}". You earned 50 XP and 20 pts.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveFallbackDb(db);

      // 4. Recalculate Score
      await updateScorePipeline(departmentId, isOnline);
    }

    return NextResponse.json({ success: true, ack: updatedAck });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Recalculation trigger helper (same multi-dimensional score sync)
async function updateScorePipeline(departmentId: string, isOnline: boolean) {
  const period = new Date().toISOString().substring(0, 7);

  try {
    let carbonTotal = 0;
    let environmentalScore = 100;
    let socialScore = 100;
    let governanceScore = 100;
    let targetBaseline = 10000;

    if (isOnline) {
      const transactions = await prisma.carbonTransaction.findMany({ where: { departmentId } });
      carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

      const goals = await prisma.goal.findMany({ where: { departmentId, status: 'Active' } });
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
      }
      environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      const employees = await prisma.employee.findMany({ where: { departmentId } });
      const totalEmployees = employees.length;

      let csrParticipationRate = 0;
      if (totalEmployees > 0) {
        const parts = await prisma.employeeParticipation.findMany({
          where: {
            employee: { departmentId },
            approvalStatus: 'Approved',
          },
          distinct: ['employeeId'],
        });
        csrParticipationRate = (parts.length / totalEmployees) * 100;
      }
      socialScore = (csrParticipationRate * 0.6) + (100 * 0.4);

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

      const totalScore = (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3);

      const existingScore = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
      });

      if (existingScore) {
        await prisma.departmentScore.update({
          where: { id: existingScore.id },
          data: { carbonTotal, environmentalScore, socialScore, governanceScore, totalScore },
        });
      } else {
        await prisma.departmentScore.create({
          data: { departmentId, period, environmentalScore, socialScore, governanceScore, totalScore, carbonTotal },
        });
      }
    } else {
      const db = getFallbackDb();
      
      const transactions = db.carbonTransactions.filter((t: any) => t.departmentId === departmentId);
      carbonTotal = transactions.reduce((sum: number, t: any) => sum + t.totalEmissions, 0);

      const goals = db.goals.filter((g: any) => g.departmentId === departmentId && g.status === 'Active');
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum: number, g: any) => sum + g.targetValue, 0);
      }
      environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      const employees = db.employees.filter((e: any) => e.departmentId === departmentId);
      const totalEmployees = employees.length;

      let csrParticipationRate = 0;
      if (totalEmployees > 0) {
        const approvedParts = db.employeeParticipations.filter(
          (p: any) => {
            const emp = db.employees.find((e: any) => e.id === p.employeeId);
            return emp?.departmentId === departmentId && p.approvalStatus === 'Approved';
          }
        );
        const uniqueEmpIds = Array.from(new Set(approvedParts.map((p: any) => p.employeeId)));
        csrParticipationRate = (uniqueEmpIds.length / totalEmployees) * 100;
      }
      socialScore = (csrParticipationRate * 0.6) + (100 * 0.4);

      const policyAcks = db.policyAcknowledgements.filter(
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

      const totalScore = (environmentalScore * 0.4) + (socialScore * 0.3) + (governanceScore * 0.3);

      const scoreIndex = db.departmentScores.findIndex(
        (s: any) => s.departmentId === departmentId && s.period === period
      );

      const scoreData = {
        departmentId,
        period,
        environmentalScore,
        socialScore,
        governanceScore,
        totalScore,
        carbonTotal,
      };

      if (scoreIndex >= 0) {
        db.departmentScores[scoreIndex] = { ...db.departmentScores[scoreIndex], ...scoreData };
      } else {
        db.departmentScores.push({
          id: `ds-${Math.random().toString(36).substr(2, 9)}`,
          ...scoreData,
        });
      }

      saveFallbackDb(db);
    }
  } catch (err) {
    console.error('Failed to update scoring pipeline:', err);
  }
}
