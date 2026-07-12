import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const { id } = await params;

  try {
    const body = await req.json();
    const { proofData } = body;

    if (!proofData) {
      return NextResponse.json({ error: 'Missing proofData base64 image.' }, { status: 400 });
    }

    let updatedPart: any;

    if (isOnline) {
      const part = await prisma.employeeParticipation.findUnique({
        where: { id },
      });
      if (!part) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      updatedPart = await prisma.employeeParticipation.update({
        where: { id },
        data: {
          proofData,
          approvalStatus: 'Submitted',
        },
        include: {
          activity: true,
        },
      });
    } else {
      const db = getFallbackDb();
      const partIndex = db.employeeParticipations.findIndex((p: any) => p.id === id);
      if (partIndex < 0) {
        return NextResponse.json({ error: 'Participation log not found.' }, { status: 404 });
      }

      db.employeeParticipations[partIndex] = {
        ...db.employeeParticipations[partIndex],
        proofData,
        approvalStatus: 'Submitted',
      };
      updatedPart = db.employeeParticipations[partIndex];
      saveFallbackDb(db);

      updatedPart = {
        ...updatedPart,
        activity: db.csrActivities.find((a: any) => a.id === updatedPart.csrActivityId || a.id === updatedPart.activityId),
      };
    }

    return NextResponse.json(updatedPart);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
