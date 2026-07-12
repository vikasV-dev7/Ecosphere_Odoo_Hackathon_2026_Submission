import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get('status');

  try {
    if (isOnline) {
      // Filter Drafts if not Admin
      const whereClause: any = {};
      if (statusParam) {
        whereClause.status = statusParam;
      } else if (userRole !== 'Admin') {
        whereClause.status = { not: 'Draft' };
      }

      const challenges = await prisma.challenge.findMany({
        where: whereClause,
        include: {
          category: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(challenges);
    } else {
      const db = getFallbackDb();
      let list = db.challenges || [];
      if (statusParam) {
        list = list.filter((c: any) => c.status === statusParam);
      } else if (userRole !== 'Admin') {
        list = list.filter((c: any) => c.status !== 'Draft');
      }
      
      const enriched = list.map((c: any) => ({
        ...c,
        category: db.categories.find((cat: any) => cat.id === c.categoryId),
      }));
      return NextResponse.json(enriched);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';

  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, categoryId, description, xpReward, pointsReward, difficulty, progressType, targetValue, evidenceRequired, deadline } = body;

    if (!title || !categoryId || !description || xpReward === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    let newChal: any;

    if (isOnline) {
      newChal = await prisma.challenge.create({
        data: {
          title,
          categoryId,
          description,
          xpReward: Number(xpReward),
          pointsReward: Number(pointsReward || 0),
          difficulty: difficulty || 'Medium',
          progressType: progressType || 'counter',
          targetValue: Number(targetValue || 1),
          evidenceRequired: evidenceRequired !== undefined ? evidenceRequired : true,
          deadline: deadline ? new Date(deadline) : null,
          status: 'Draft',
        },
      });
    } else {
      const db = getFallbackDb();
      newChal = {
        id: `chal-${Math.random().toString(36).substr(2, 9)}`,
        title,
        categoryId,
        description,
        xpReward: Number(xpReward),
        pointsReward: Number(pointsReward || 0),
        difficulty: difficulty || 'Medium',
        progressType: progressType || 'counter',
        targetValue: Number(targetValue || 1),
        evidenceRequired: evidenceRequired !== undefined ? evidenceRequired : true,
        deadline: deadline || null,
        status: 'Draft',
        createdAt: new Date().toISOString(),
      };
      db.challenges.push(newChal);
      saveFallbackDb(db);
    }

    return NextResponse.json(newChal);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
