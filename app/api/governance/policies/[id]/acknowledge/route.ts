import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';
import { updateScorePipeline } from '@/app/api/scores/calculate/route';

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);
    }

    return NextResponse.json({ success: true, ack: updatedAck });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

