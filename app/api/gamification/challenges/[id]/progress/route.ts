import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';
import { registerEsgAction } from '@/services/gamification-service';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';
  const { id: challengeId } = await params;

  try {
    const body = await req.json();
    const { value } = body;

    if (value === undefined || isNaN(Number(value))) {
      return NextResponse.json({ error: 'Missing or invalid value parameter.' }, { status: 400 });
    }

    const incrementAmount = Number(value);
    let participation: any;
    let employeeId = '';
    let departmentId = '';

    if (isOnline) {
      const employee = await prisma.employee.findUnique({ where: { email: userEmail } });
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;
      departmentId = employee.departmentId;

      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }

      let part = await prisma.challengeParticipation.findFirst({
        where: { challengeId, employeeId }
      });

      if (!part) {
        // Auto-join on progress if not already joined
        part = await prisma.challengeParticipation.create({
          data: { challengeId, employeeId, progress: 0, approvalStatus: 'InProgress' }
        });
      }

      if (part.approvalStatus === 'Approved') {
        return NextResponse.json({ error: 'Challenge already completed.' }, { status: 400 });
      }

      const newProgress = Math.min(challenge.targetValue, part.progress + incrementAmount);
      const isCompleted = newProgress >= challenge.targetValue;

      let nextStatus = part.approvalStatus;
      let xpAwarded = 0;
      let pointsAwarded = 0;
      let completedAt = part.completedAt;

      // If no evidence is required, we can auto-approve on reaching target value
      if (isCompleted && !challenge.evidenceRequired) {
        nextStatus = 'Approved';
        xpAwarded = challenge.xpReward;
        pointsAwarded = challenge.pointsReward;
        completedAt = new Date();

        // Award employee XP & points
        await prisma.employee.update({
          where: { id: employeeId },
          data: {
            xp: { increment: challenge.xpReward },
            totalPoints: { increment: challenge.pointsReward }
          }
        });
      }

      participation = await prisma.challengeParticipation.update({
        where: { id: part.id },
        data: {
          progress: newProgress,
          approvalStatus: nextStatus,
          xpAwarded,
          pointsAwarded,
          completedAt
        }
      });

      // Post-action rewards & scoring (streak, badges)
      await registerEsgAction(employeeId, departmentId);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;
      departmentId = employee.departmentId;

      const challenge = db.challenges.find((c: any) => c.id === challengeId);
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }

      let partIndex = db.challengeParticipations.findIndex(
        (p: any) => p.challengeId === challengeId && p.employeeId === employeeId
      );

      let part: any;
      if (partIndex < 0) {
        part = {
          id: `cp-${Math.random().toString(36).substr(2, 9)}`,
          challengeId,
          employeeId,
          progress: 0,
          approvalStatus: 'InProgress',
          xpAwarded: 0,
          pointsAwarded: 0,
          completedAt: null,
          createdAt: new Date().toISOString()
        };
        db.challengeParticipations.push(part);
        partIndex = db.challengeParticipations.length - 1;
      } else {
        part = db.challengeParticipations[partIndex];
      }

      if (part.approvalStatus === 'Approved') {
        return NextResponse.json({ error: 'Challenge already completed.' }, { status: 400 });
      }

      const newProgress = Math.min(challenge.targetValue, part.progress + incrementAmount);
      const isCompleted = newProgress >= challenge.targetValue;

      let nextStatus = part.approvalStatus;
      let xpAwarded = 0;
      let pointsAwarded = 0;
      let completedAt = part.completedAt;

      if (isCompleted && !challenge.evidenceRequired) {
        nextStatus = 'Approved';
        xpAwarded = challenge.xpReward;
        pointsAwarded = challenge.pointsReward;
        completedAt = new Date().toISOString();

        // Award employee
        const empIndex = db.employees.findIndex((e: any) => e.id === employeeId);
        if (empIndex >= 0) {
          db.employees[empIndex].xp += challenge.xpReward;
          db.employees[empIndex].totalPoints += challenge.pointsReward;
        }
      }

      participation = {
        ...part,
        progress: newProgress,
        approvalStatus: nextStatus,
        xpAwarded,
        pointsAwarded,
        completedAt
      };
      db.challengeParticipations[partIndex] = participation;
      saveFallbackDb(db);

      // Post-action rewards & scoring (streak, badges)
      await registerEsgAction(employeeId, departmentId);
    }

    return NextResponse.json(participation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
