import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { id } = await params;

  // Permission Gate: Admin or Dept Head
  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    let approvedPart: any;
    let employeeId = '';
    let departmentId = '';

    if (isOnline) {
      const part = await prisma.employeeParticipation.findUnique({
        where: { id },
        include: {
          activity: true,
          employee: true,
        },
      });

      if (!part) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      employeeId = part.employeeId;
      departmentId = part.employee.departmentId;

      const xpEarned = part.activity.xpReward;
      const pointsEarned = part.activity.pointsReward;

      // 1. Update status
      approvedPart = await prisma.employeeParticipation.update({
        where: { id },
        data: {
          approvalStatus: 'Approved',
          xpEarned,
          pointsEarned,
          completionDate: new Date(),
        },
        include: { activity: true },
      });

      // 2. Award XP and Points to Employee
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          xp: { increment: xpEarned },
          totalPoints: { increment: pointsEarned },
        },
      });

      // 3. Create Notification
      await prisma.notification.create({
        data: {
          employeeId,
          type: 'csr_approval',
          title: 'CSR Participation Approved',
          message: `You earned ${xpEarned} XP and ${pointsEarned} pts for volunteering in "${part.activity.title}".`,
          read: false,
        },
      });

      // 4. Trigger Score Calculation
      await updateScorePipeline(departmentId, isOnline);

    } else {
      const db = getFallbackDb();
      const partIndex = db.employeeParticipations.findIndex((p: any) => p.id === id);

      if (partIndex < 0) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      const part = db.employeeParticipations[partIndex];
      const activity = db.csrActivities.find((a: any) => a.id === part.csrActivityId || a.id === part.activityId);
      const employee = db.employees.find((e: any) => e.id === part.employeeId);

      if (!activity || !employee) {
        return NextResponse.json({ error: 'Linked activity or employee not found.' }, { status: 404 });
      }

      employeeId = employee.id;
      departmentId = employee.departmentId;

      const xpEarned = activity.xpReward || 100;
      const pointsEarned = activity.pointsReward || 50;

      // 1. Update status
      db.employeeParticipations[partIndex] = {
        ...part,
        approvalStatus: 'Approved',
        xpEarned,
        pointsEarned,
        completionDate: new Date().toISOString(),
      };
      approvedPart = db.employeeParticipations[partIndex];

      // 2. Award XP and Points
      db.employees = db.employees.map((e: any) =>
        e.id === employeeId
          ? { ...e, xp: e.xp + xpEarned, totalPoints: e.totalPoints + pointsEarned }
          : e
      );

      // 3. Create Notification
      db.notifications.push({
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        type: 'csr_approval',
        title: 'CSR Participation Approved',
        message: `You earned ${xpEarned} XP and ${pointsEarned} pts for volunteering in "${activity.title}".`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveFallbackDb(db);

      approvedPart = {
        ...approvedPart,
        activity,
      };

      // 4. Trigger Score Calculation
      await updateScorePipeline(departmentId, isOnline);
    }

    return NextResponse.json(approvedPart);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Score recalculation trigger helper
async function updateScorePipeline(departmentId: string, isOnline: boolean) {
  const period = new Date().toISOString().substring(0, 7);

  try {
    let carbonTotal = 0;
    let environmentalScore = 100;
    let socialScore = 100;
    let governanceScore = 100;

    let targetBaseline = 10000;

    if (isOnline) {
      // --- ENVIRONMENT ---
      const transactions = await prisma.carbonTransaction.findMany({ where: { departmentId } });
      carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

      const goals = await prisma.goal.findMany({ where: { departmentId, status: 'Active' } });
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
      }
      environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      // --- SOCIAL ---
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
      const trainingCompletionRate = 100; // placeholder
      socialScore = (csrParticipationRate * 0.6) + (trainingCompletionRate * 0.4);

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

      // Penalties: number of Open High/Critical compliance issues in the department's audits
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
          data: {
            carbonTotal,
            environmentalScore,
            socialScore,
            governanceScore,
            totalScore,
          },
        });
      } else {
        await prisma.departmentScore.create({
          data: {
            departmentId,
            period,
            environmentalScore,
            socialScore,
            governanceScore,
            totalScore,
            carbonTotal,
          },
        });
      }

    } else {
      const db = getFallbackDb();
      
      // --- ENVIRONMENT ---
      const transactions = db.carbonTransactions.filter((t: any) => t.departmentId === departmentId);
      carbonTotal = transactions.reduce((sum: number, t: any) => sum + t.totalEmissions, 0);

      const goals = db.goals.filter((g: any) => g.departmentId === departmentId && g.status === 'Active');
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum: number, g: any) => sum + g.targetValue, 0);
      }
      environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      // --- SOCIAL ---
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
      const trainingCompletionRate = 100;
      socialScore = (csrParticipationRate * 0.6) + (trainingCompletionRate * 0.4);

      // --- GOVERNANCE ---
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
    console.error('Failed to update multi-dimensional scoring pipeline:', err);
  }
}
