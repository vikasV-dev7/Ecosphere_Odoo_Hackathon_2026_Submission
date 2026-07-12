import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const category = searchParams.get('category');
  const period = searchParams.get('period') || new Date().toISOString().substring(0, 7);

  if (!departmentId) {
    return NextResponse.json({ error: 'departmentId is required.' }, { status: 400 });
  }

  try {
    if (isOnline) {
      const departmentScore = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
      });

      if (!departmentScore) {
        return NextResponse.json({ error: 'Score not found for the given period.' }, { status: 404 });
      }

      const whereClause: any = { departmentScoreId: departmentScore.id };
      if (category) {
        whereClause.category = category;
      }

      const breakdowns = await prisma.scoreBreakdown.findMany({
        where: whereClause,
      });

      return NextResponse.json({
        departmentScore,
        breakdowns,
      });
    } else {
      const db = getFallbackDb();
      const departmentScore = db.departmentScores.find(
        (s: any) => s.departmentId === departmentId && s.period === period
      );

      if (!departmentScore) {
        return NextResponse.json({ error: 'Score not found for the given period.' }, { status: 404 });
      }

      let breakdowns = (db.scoreBreakdowns || []).filter(
        (b: any) => b.departmentScoreId === departmentScore.id
      );

      if (category) {
        breakdowns = breakdowns.filter((b: any) => b.category === category);
      }

      return NextResponse.json({
        departmentScore,
        breakdowns,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
