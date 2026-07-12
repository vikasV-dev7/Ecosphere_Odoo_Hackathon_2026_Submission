import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') || new Date().toISOString().substring(0, 7);

  try {
    if (isOnline) {
      const scores = await prisma.departmentScore.findMany({
        where: { period },
      });
      const departments = await prisma.department.findMany();
      const enriched = scores.map(s => ({
        ...s,
        department: departments.find(d => d.id === s.departmentId)
      }));

      return NextResponse.json(enriched);
    } else {
      const db = getFallbackDb();
      const scores = db.departmentScores.filter((s: any) => s.period === period);
      
      const enriched = scores.map((s: any) => ({
        ...s,
        department: db.departments.find((d: any) => d.id === s.departmentId),
      }));

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
