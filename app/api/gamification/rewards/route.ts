import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    if (isOnline) {
      const rewards = await prisma.reward.findMany({
        orderBy: { pointsRequired: 'asc' }
      });
      return NextResponse.json(rewards);
    } else {
      const db = getFallbackDb();
      const rewards = db.rewards || [];
      return NextResponse.json(rewards);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
