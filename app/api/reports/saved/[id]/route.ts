import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    let isOnline = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isOnline = true;
    } catch (e) {
      isOnline = false;
    }

    let report = null;
    if (isOnline) {
      report = await prisma.savedReport.findUnique({
        where: { id }
      });
    } else {
      const db = getFallbackDb();
      report = db.savedReports?.find((r: any) => r.id === id);
    }

    if (!report) {
      return NextResponse.json({ success: false, error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: report });
  } catch (e: any) {
    console.error('Get saved report error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
