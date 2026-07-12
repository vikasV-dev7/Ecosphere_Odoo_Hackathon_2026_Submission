import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

const validTransitions: { [key: string]: string[] } = {
  Draft: ['Active', 'Archived'],
  Active: ['UnderReview', 'Archived'],
  UnderReview: ['Completed', 'Archived'],
  Completed: ['Archived'],
  Archived: []
};

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { id } = await params;

  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { status: nextStatus } = body;

    if (!nextStatus) {
      return NextResponse.json({ error: 'Missing status parameter.' }, { status: 400 });
    }

    let updatedChal: any;

    if (isOnline) {
      const challenge = await prisma.challenge.findUnique({ where: { id } });
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }

      const allowed = validTransitions[challenge.status] || [];
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json({ error: `Invalid transition from ${challenge.status} to ${nextStatus}.` }, { status: 400 });
      }

      updatedChal = await prisma.challenge.update({
        where: { id },
        data: { status: nextStatus }
      });
    } else {
      const db = getFallbackDb();
      const chalIndex = db.challenges.findIndex((c: any) => c.id === id);
      if (chalIndex < 0) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }

      const challenge = db.challenges[chalIndex];
      const allowed = validTransitions[challenge.status] || [];
      if (!allowed.includes(nextStatus)) {
        return NextResponse.json({ error: `Invalid transition from ${challenge.status} to ${nextStatus}.` }, { status: 400 });
      }

      challenge.status = nextStatus;
      db.challenges[chalIndex] = challenge;
      saveFallbackDb(db);
      updatedChal = challenge;
    }

    return NextResponse.json(updatedChal);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
