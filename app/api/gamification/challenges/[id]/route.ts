import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const { id } = await params;

  try {
    if (isOnline) {
      const challenge = await prisma.challenge.findUnique({
        where: { id },
        include: {
          category: true,
          participations: {
            include: { employee: true }
          }
        }
      });
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }
      return NextResponse.json(challenge);
    } else {
      const db = getFallbackDb();
      const challenge = db.challenges.find((c: any) => c.id === id);
      if (!challenge) {
        return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
      }
      
      const enriched = {
        ...challenge,
        category: db.categories.find((cat: any) => cat.id === challenge.categoryId),
        participations: db.challengeParticipations
          .filter((p: any) => p.challengeId === id)
          .map((p: any) => ({
            ...p,
            employee: db.employees.find((e: any) => e.id === p.employeeId)
          }))
      };
      return NextResponse.json(enriched);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
