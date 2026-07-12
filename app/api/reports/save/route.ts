import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, config, userId = 'user-1' } = body;

    if (!name || !config) {
      return NextResponse.json({ success: false, error: 'Name and config are required' }, { status: 400 });
    }

    let isOnline = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      isOnline = true;
    } catch (e) {
      isOnline = false;
    }

    let report;
    if (isOnline) {
      report = await prisma.savedReport.create({
        data: {
          name,
          config,
          userId,
        }
      });
    } else {
      const db = getFallbackDb();
      report = {
        id: `sr-${Date.now()}`,
        name,
        config,
        userId,
        createdAt: new Date().toISOString()
      };
      // We added this helper to db-fallback.ts
      (getFallbackDb() as any).saveReport?.(report);
      if (!db.savedReports) db.savedReports = [];
    }

    return NextResponse.json({ success: true, data: report });
  } catch (e: any) {
    console.error('Save report error:', e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
