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
    const body = await req.json();
    const { proofData } = body;

    if (!proofData) {
      return NextResponse.json({ error: 'Missing proofData base64 image.' }, { status: 400 });
    }

    let employeeId = '';
    let participation: any;

    if (isOnline) {
      const employee = await prisma.employee.findUnique({ where: { email: userEmail } });
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;

      const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }

      let part = await prisma.challengeParticipation.findFirst({
        where: { challengeId, employeeId }
      });

      if (!part) {
        part = await prisma.challengeParticipation.create({
          data: { challengeId, employeeId, progress: 0, approvalStatus: 'InProgress' }
        });
      }

      if (part.approvalStatus === 'Approved') {
        return NextResponse.json({ error: 'Challenge already approved.' }, { status: 400 });
      }

      participation = await prisma.challengeParticipation.update({
        where: { id: part.id },
        data: {
          proofData,
          progress: challenge.targetValue, // Set progress to maximum upon submission
          approvalStatus: 'Submitted',
        }
      });
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

      let partIndex = db.challengeParticipations.findIndex(
        (p: any) => p.challengeId === challengeId && p.employeeId === employeeId
      );

      let part: any;
      if (partIndex < 0) {
        part = {
          id: `cp-${Math.random().toString(36).substr(2, 9)}`,
          challengeId,
          employeeId,
          progress: challenge.targetValue,
          approvalStatus: 'Submitted',
          proofData,
          xpAwarded: 0,
          pointsAwarded: 0,
          completedAt: null,
          createdAt: new Date().toISOString()
        };
        db.challengeParticipations.push(part);
      } else {
        part = db.challengeParticipations[partIndex];
        part.progress = challenge.targetValue;
        part.approvalStatus = 'Submitted';
        part.proofData = proofData;
        db.challengeParticipations[partIndex] = part;
      }

      participation = part;
      saveFallbackDb(db);
    }

    return NextResponse.json(participation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
