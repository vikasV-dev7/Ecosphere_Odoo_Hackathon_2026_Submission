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
    let rejectedPart: any;
    let employeeId = '';

    if (isOnline) {
      const part = await prisma.employeeParticipation.findUnique({
        where: { id },
        include: {
          activity: true,
        },
      });

      if (!part) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      employeeId = part.employeeId;

      rejectedPart = await prisma.employeeParticipation.update({
        where: { id },
        data: {
          approvalStatus: 'Rejected',
        },
        include: { activity: true },
      });

      // Create Notification
      await prisma.notification.create({
        data: {
          employeeId,
          type: 'csr_approval',
          title: 'CSR Participation Rejected',
          message: `Your proof submission for "${part.activity.title}" was not approved. Please verify details and submit again.`,
          read: false,
        },
      });

    } else {
      const db = getFallbackDb();
      const partIndex = db.employeeParticipations.findIndex((p: any) => p.id === id);

      if (partIndex < 0) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      const part = db.employeeParticipations[partIndex];
      const activity = db.csrActivities.find((a: any) => a.id === part.csrActivityId || a.id === part.activityId);

      if (!activity) {
        return NextResponse.json({ error: 'Linked activity not found.' }, { status: 404 });
      }

      employeeId = part.employeeId;

      db.employeeParticipations[partIndex] = {
        ...part,
        approvalStatus: 'Rejected',
      };
      rejectedPart = db.employeeParticipations[partIndex];

      // Create Notification
      db.notifications.push({
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        type: 'csr_approval',
        title: 'CSR Participation Rejected',
        message: `Your proof submission for "${activity.title}" was not approved. Please verify details and submit again.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      saveFallbackDb(db);

      rejectedPart = {
        ...rejectedPart,
        activity,
      };
    }

    return NextResponse.json(rejectedPart);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
