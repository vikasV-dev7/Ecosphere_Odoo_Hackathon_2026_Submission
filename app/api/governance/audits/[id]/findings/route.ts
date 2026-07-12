import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { id: auditId } = await params;

  // Gated: Admin only
  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { severity, description, owner, dueDate } = body;

    if (!severity || !description || !owner || !dueDate) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    let newIssue: any;
    let departmentId = '';

    if (isOnline) {
      const audit = await prisma.audit.findUnique({
        where: { id: auditId },
      });
      if (!audit) {
        return NextResponse.json({ error: 'Audit log not found.' }, { status: 404 });
      }
      departmentId = audit.departmentId;

      newIssue = await prisma.complianceIssue.create({
        data: {
          auditId,
          severity,
          description,
          owner, // Name/email of assignee
          dueDate: new Date(dueDate),
          status: 'Open',
        },
      });

      // Look up owner to send notification if they exist in system
      const employee = await prisma.employee.findFirst({
        where: {
          OR: [
            { email: owner },
            { name: { contains: owner } },
          ],
        },
      });

      if (employee) {
        await prisma.notification.create({
          data: {
            employeeId: employee.id,
            type: 'compliance_issue_assigned',
            title: 'New Compliance Issue Assigned',
            message: `A new ${severity} severity issue was logged: "${description}". Due by ${new Date(dueDate).toLocaleDateString()}.`,
            read: false,
          },
        });
      }

      // Recalculate score (penalties change when open High/Critical issues change)
      await updateScorePipeline(departmentId, isOnline);

    } else {
      const db = getFallbackDb();
      const audit = db.audits.find((a: any) => a.id === auditId);
      if (!audit) {
        return NextResponse.json({ error: 'Audit log not found.' }, { status: 404 });
      }
      departmentId = audit.departmentId;

      newIssue = {
        id: `iss-${Math.random().toString(36).substr(2, 9)}`,
        auditId,
        severity,
        description,
        owner,
        dueDate: new Date(dueDate).toISOString(),
        status: 'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.complianceIssues.push(newIssue);

      // Search for employee
      const employee = db.employees.find(
        (e: any) => e.email === owner || e.name.toLowerCase().includes(owner.toLowerCase())
      );

      if (employee) {
        db.notifications.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          employeeId: employee.id,
          type: 'compliance_issue_assigned',
          title: 'New Compliance Issue Assigned',
          message: `A new ${severity} severity issue was logged: "${description}". Due by ${new Date(dueDate).toLocaleDateString()}.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }

      saveFallbackDb(db);

      // Recalculate score
      await updateScorePipeline(departmentId, isOnline);
    }

    return NextResponse.json(newIssue);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Recalculation pipeline trigger helper
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
