import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';
  const { id: challengeId } = await params;

  try {
    let employeeId = '';

    if (isOnline) {
      const employee = await prisma.employee.findUnique({ where: { email: userEmail } });
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;

      // Check if challenge is Active
      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }
      if (challenge.status !== 'Active') {
        return NextResponse.json({ error: 'This challenge is not open for participation.' }, { status: 400 });
      }

      // Check existing participation
      const existing = await prisma.challengeParticipation.findFirst({
        where: { challengeId, employeeId }
      });
      if (existing) {
        return NextResponse.json(existing);
      }

      const participation = await prisma.challengeParticipation.create({
        data: {
          challengeId,
          employeeId,
          progress: 0,
          approvalStatus: 'InProgress',
        }
      });
      return NextResponse.json(participation);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;

      const challenge = db.challenges.find((c: any) => c.id === challengeId);
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }
      if (challenge.status !== 'Active') {
        return NextResponse.json({ error: 'This challenge is not open for participation.' }, { status: 400 });
      }

      const existing = db.challengeParticipations.find(
        (p: any) => p.challengeId === challengeId && p.employeeId === employeeId
      );
      if (existing) {
        return NextResponse.json(existing);
      }

      const participation = {
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
      db.challengeParticipations.push(participation);
      saveFallbackDb(db);
      return NextResponse.json(participation);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
