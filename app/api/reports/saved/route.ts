import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user-1';

    let isOnline = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isOnline = true;
    } catch (e) {
      isOnline = false;
    }

    let reports = [];
    if (isOnline) {
      reports = await prisma.savedReport.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      const db = getFallbackDb();
      reports = db.savedReports?.filter((r: any) => r.userId === userId) || [];
    }

    return NextResponse.json({ success: true, data: reports });
  } catch (e: any) {
    console.error('List saved reports error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
