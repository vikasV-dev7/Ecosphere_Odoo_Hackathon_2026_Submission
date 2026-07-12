import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  if (!departmentId) {
    return NextResponse.json({ error: 'Missing departmentId query parameter.' }, { status: 400 });
  }

  try {
    let carbonTotal = 0;
    let targetBaseline = 10000; // default baseline

    if (isOnline) {
      // Query transactions
      const transactions = await prisma.carbonTransaction.findMany({
        where: { departmentId },
      });
      carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

      // Query active goals
      const goals = await prisma.goal.findMany({
        where: { departmentId, status: 'Active' },
      });
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
      }
    } else {
      const transactions = fallbackDb.getTransactions().filter((t: any) => t.departmentId === departmentId);
      carbonTotal = transactions.reduce((sum: number, t: any) => sum + t.totalEmissions, 0);

      const goals = fallbackDb.getGoals().filter((g: any) => g.departmentId === departmentId && g.status === 'Active');
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum: number, g: any) => sum + g.targetValue, 0);
      }
    }

    const environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

    return NextResponse.json({
      departmentId,
      carbonTotal,
      targetBaseline,
      environmentalScore: Math.round(environmentalScore),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
