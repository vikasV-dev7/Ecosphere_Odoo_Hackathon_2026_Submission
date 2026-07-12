import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb, getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  try {
    if (isOnline) {
      const where: any = {};
      if (employeeId) where.employeeId = employeeId;

      const participations = await prisma.employeeParticipation.findMany({
        where,
        include: {
          employee: true,
          activity: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(participations);
    } else {
      let participations = fallbackDb.getEmployeeParticipations();
      if (employeeId) {
        participations = participations.filter((p: any) => p.employeeId === employeeId);
      }

      const employees = fallbackDb.getEmployees();
      const activities = fallbackDb.getCSRActivities();

      const enriched = participations.map((p: any) => ({
        ...p,
        employee: employees.find((e: any) => e.id === p.employeeId),
        activity: activities.find((a: any) => a.id === p.csrActivityId || a.id === p.activityId),
      }));

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    const body = await req.json();
    const { employeeId, activityId } = body;

    if (!employeeId || !activityId) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (isOnline) {
      // Check if already registered
      const existing = await prisma.employeeParticipation.findFirst({
        where: { employeeId, activityId },
      });
      if (existing) {
        return NextResponse.json({ error: 'Already registered for this activity.' }, { status: 400 });
      }

      const participation = await prisma.employeeParticipation.create({
        data: {
          employeeId,
          activityId,
          approvalStatus: 'Registered',
          pointsEarned: 0,
          xpEarned: 0,
        },
        include: {
          activity: true,
        },
      });

      return NextResponse.json(participation);
    } else {
      const db = getFallbackDb();
      const existing = db.employeeParticipations.find(
        (p: any) => p.employeeId === employeeId && (p.csrActivityId === activityId || p.activityId === activityId)
      );
      if (existing) {
        return NextResponse.json({ error: 'Already registered for this activity.' }, { status: 400 });
      }

      const newPart = {
        id: `part-${Math.random().toString(36).substr(2, 9)}`,
        employeeId,
        csrActivityId: activityId,
        activityId, // link both keys for backward-compatibility
        approvalStatus: 'Registered',
        pointsEarned: 0,
        xpEarned: 0,
        createdAt: new Date().toISOString(),
      };
      db.employeeParticipations.push(newPart);
      saveFallbackDb(db);

      const enriched = {
        ...newPart,
        activity: db.csrActivities.find((a: any) => a.id === activityId),
        employee: db.employees.find((e: any) => e.id === employeeId),
      };

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
