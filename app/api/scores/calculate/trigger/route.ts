import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';
import { updateScorePipeline } from '../route';

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Admin';

  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin privilege required.' }, { status: 403 });
  }

  try {
    const period = new Date().toISOString().substring(0, 7);
    const depts = isOnline 
      ? await prisma.department.findMany() 
      : getFallbackDb().departments;

    const results = [];
    for (const d of depts) {
      const res = await updateScorePipeline(d.id, isOnline, period);
      results.push(res);
    }

    return NextResponse.json({
      success: true,
      message: 'Scores recalculated successfully.',
      period,
      recalculated: results.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
