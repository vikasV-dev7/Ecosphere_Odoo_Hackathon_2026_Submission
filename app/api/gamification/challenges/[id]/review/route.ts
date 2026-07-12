import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';
import { registerEsgAction } from '@/services/gamification-service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { id: participationId } = await params;

  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { approvalStatus } = body; // 'Approved' or 'Rejected'

    if (!approvalStatus || (approvalStatus !== 'Approved' && approvalStatus !== 'Rejected')) {
      return NextResponse.json({ error: 'Invalid approval status.' }, { status: 400 });
    }

    let updatedPart: any;
    let employeeId = '';
    let departmentId = '';

    if (isOnline) {
      const part = await prisma.challengeParticipation.findUnique({
        where: { id: participationId },
        include: {
          challenge: true,
          employee: true
        }
      });

      if (!part) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      employeeId = part.employeeId;
      departmentId = part.employee.departmentId;

      if (part.approvalStatus === 'Approved') {
        return NextResponse.json({ error: 'Already approved.' }, { status: 400 });
      }

      if (approvalStatus === 'Approved') {
        // Award XP & points
        await prisma.employee.update({
          where: { id: employeeId },
          data: {
            xp: { increment: part.challenge.xpReward },
            totalPoints: { increment: part.challenge.pointsReward }
          }
        });

        // Save approval status
        updatedPart = await prisma.challengeParticipation.update({
          where: { id: participationId },
          data: {
            approvalStatus: 'Approved',
            xpAwarded: part.challenge.xpReward,
            pointsAwarded: part.challenge.pointsReward,
            completedAt: new Date()
          }
        });

        // Dispatch alert notification
        await prisma.notification.create({
          data: {
            employeeId,
            type: 'badge_unlock',
            title: 'Challenge Approved!',
            message: `Your proof for "${part.challenge.title}" was approved! +${part.challenge.xpReward} XP and +${part.challenge.pointsReward} pts awarded.`,
            read: false,
          }
        });

        // Update streak, badges, score pipeline
        await registerEsgAction(employeeId, departmentId);
      } else {
        updatedPart = await prisma.challengeParticipation.update({
          where: { id: participationId },
          data: {
            approvalStatus: 'Rejected'
          }
        });

        await prisma.notification.create({
          data: {
            employeeId,
            type: 'badge_unlock',
            title: 'Challenge Proof Rejected',
            message: `Your proof for "${part.challenge.title}" was rejected. Please review guidelines and submit again.`,
            read: false,
          }
        });
      }
    } else {
      const db = getFallbackDb();
      const partIndex = db.challengeParticipations.findIndex((p: any) => p.id === participationId);
      if (partIndex < 0) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }
      const part = db.challengeParticipations[partIndex];
      const challenge = db.challenges.find((c: any) => c.id === part.challengeId);
      const employee = db.employees.find((e: any) => e.id === part.employeeId);

      if (!challenge || !employee) {
        return NextResponse.json({ error: 'Relational data missing.' }, { status: 400 });
      }

      employeeId = employee.id;
      departmentId = employee.departmentId;

      if (part.approvalStatus === 'Approved') {
        return NextResponse.json({ error: 'Already approved.' }, { status: 400 });
      }

      if (approvalStatus === 'Approved') {
        // Update employee
        const empIndex = db.employees.findIndex((e: any) => e.id === employeeId);
        if (empIndex >= 0) {
          db.employees[empIndex].xp += challenge.xpReward;
          db.employees[empIndex].totalPoints += challenge.pointsReward;
        }

        part.approvalStatus = 'Approved';
        part.xpAwarded = challenge.xpReward;
        part.pointsAwarded = challenge.pointsReward;
        part.completedAt = new Date().toISOString();

        db.notifications.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          employeeId,
          type: 'badge_unlock',
          title: 'Challenge Approved!',
          message: `Your proof for "${challenge.title}" was approved! +${challenge.xpReward} XP and +${challenge.pointsReward} pts awarded.`,
          read: false,
          createdAt: new Date().toISOString()
        });

        db.challengeParticipations[partIndex] = part;
        saveFallbackDb(db);

        // Update streak, badges, score pipeline
        await registerEsgAction(employeeId, departmentId);
      } else {
        part.approvalStatus = 'Rejected';
        db.challengeParticipations[partIndex] = part;

        db.notifications.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          employeeId,
          type: 'badge_unlock',
          title: 'Challenge Proof Rejected',
          message: `Your proof for "${challenge.title}" was rejected. Please review guidelines and submit again.`,
          read: false,
          createdAt: new Date().toISOString()
        });

        saveFallbackDb(db);
      }
      updatedPart = part;
    }

    return NextResponse.json(updatedPart);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
