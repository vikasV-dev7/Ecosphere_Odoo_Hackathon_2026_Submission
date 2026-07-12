import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET() {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    if (isOnline) {
      const activities = await prisma.cSRActivity.findMany({
        include: {
          category: true,
        },
        orderBy: { date: 'asc' },
      });
      return NextResponse.json(activities);
    } else {
      const activities = fallbackDb.getCSRActivities();
      const categories = fallbackDb.getCategories();

      const enriched = activities.map((act: any) => ({
        ...act,
        category: categories.find((c: any) => c.id === act.categoryId),
      }));

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';

  // Permission Gate: Admin or Dept Head
  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, categoryId, description, date, location, maxParticipants, xpReward, pointsReward, imageUrl } = body;

    if (!title || !categoryId || !description || !date || maxParticipants === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (isOnline) {
      const newAct = await prisma.cSRActivity.create({
        data: {
          title,
          categoryId,
          description,
          date: new Date(date),
          location: location || null,
          maxParticipants: parseInt(maxParticipants),
          xpReward: xpReward ? parseInt(xpReward) : 100,
          pointsReward: pointsReward ? parseInt(pointsReward) : 50,
          status: 'Active',
          proofRequired: true,
        },
      });
      return NextResponse.json(newAct);
    } else {
      const newAct = fallbackDb.createCSRActivity({
        title,
        categoryId,
        description,
        date: new Date(date).toISOString(),
        location,
        maxParticipants: parseInt(maxParticipants),
        xpReward: xpReward ? parseInt(xpReward) : 100,
        pointsReward: pointsReward ? parseInt(pointsReward) : 50,
        imageUrl: imageUrl || null
      });
      return NextResponse.json(newAct);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
