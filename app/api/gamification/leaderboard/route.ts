import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'individual'; // individual | department
  const timeRange = searchParams.get('timeRange') || 'allTime'; // allTime | month | week

  try {
    if (type === 'individual') {
      if (isOnline) {
        const employees = await prisma.employee.findMany({
          orderBy: { xp: 'desc' },
          select: {
            id: true,
            name: true,
            avatar: true,
            xp: true,
            department: {
              select: {
                name: true,
                code: true
              }
            }
          }
        });

        const list = employees.map((emp, index) => ({
          rank: index + 1,
          id: emp.id,
          name: emp.name,
          avatar: emp.avatar,
          xp: emp.xp,
          level: Math.floor(emp.xp / 1000) + 1,
          department: emp.department?.name || 'General',
          departmentCode: emp.department?.code || 'GEN'
        }));

        return NextResponse.json(list);
      } else {
        const db = getFallbackDb();
        const employees = [...db.employees].sort((a: any, b: any) => b.xp - a.xp);
        const list = employees.map((emp: any, index: number) => {
          const dept = db.departments.find((d: any) => d.id === emp.departmentId);
          return {
            rank: index + 1,
            id: emp.id,
            name: emp.name,
            avatar: emp.avatar,
            xp: emp.xp,
            level: Math.floor((emp.xp || 0) / 1000) + 1,
            department: dept ? dept.name : 'General',
            departmentCode: dept ? dept.code : 'GEN'
          };
        });
        return NextResponse.json(list);
      }
    } else {
      // Department Leaderboard
      const currentPeriod = new Date().toISOString().substring(0, 7); // e.g. '2026-07'

      if (isOnline) {
        const scores = await prisma.departmentScore.findMany({
          where: { period: currentPeriod },
          orderBy: { totalScore: 'desc' }
        });

        const departments = await prisma.department.findMany();

        const list = scores.map((score, index) => {
          const dept = departments.find(d => d.id === score.departmentId);
          return {
            rank: index + 1,
            departmentId: score.departmentId,
            name: dept?.name || 'Unknown',
            code: dept?.code || 'N/A',
            totalScore: score.totalScore,
            environmentalScore: score.environmentalScore,
            socialScore: score.socialScore,
            governanceScore: score.governanceScore
          };
        });

        return NextResponse.json(list);
      } else {
        const db = getFallbackDb();
        const scores = db.departmentScores
          .filter((s: any) => s.period === currentPeriod)
          .sort((a: any, b: any) => b.totalScore - a.totalScore);

        const list = scores.map((score: any, index: number) => {
          const dept = db.departments.find((d: any) => d.id === score.departmentId);
          return {
            rank: index + 1,
            departmentId: score.departmentId,
            name: dept ? dept.name : 'Unknown',
            code: dept ? dept.code : 'N/A',
            totalScore: score.totalScore,
            environmentalScore: score.environmentalScore,
            socialScore: score.socialScore,
            governanceScore: score.governanceScore
          };
        });
        return NextResponse.json(list);
      }
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
