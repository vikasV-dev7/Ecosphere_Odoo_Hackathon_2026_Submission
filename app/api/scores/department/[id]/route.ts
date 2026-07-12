import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const { id: departmentId } = await params;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || new Date().toISOString().substring(0, 7);

  try {
    if (isOnline) {
      const score = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
        include: {
          breakdowns: true,
        },
      });

      if (!score) {
        return NextResponse.json({ error: 'Score not found.' }, { status: 404 });
      }

      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });

      return NextResponse.json({ ...score, department });
    } else {
      const db = getFallbackDb();
      const score = db.departmentScores.find(
        (s: any) => s.departmentId === departmentId && s.period === period
      );

      if (!score) {
        return NextResponse.json({ error: 'Score not found.' }, { status: 404 });
      }

      const breakdowns = (db.scoreBreakdowns || []).filter(
        (b: any) => b.departmentScoreId === score.id
      );

      const department = db.departments.find((d: any) => d.id === departmentId);

      return NextResponse.json({
        ...score,
        breakdowns,
        department,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
