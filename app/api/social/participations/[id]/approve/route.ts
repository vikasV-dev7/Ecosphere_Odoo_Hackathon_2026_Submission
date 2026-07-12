import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';
import { updateScorePipeline } from '@/app/api/scores/calculate/route';

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);
    }

    return NextResponse.json(approvedPart);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

