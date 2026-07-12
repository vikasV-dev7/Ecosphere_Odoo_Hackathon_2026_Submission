import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');

  try {
    if (isOnline) {
      const where: any = {};
      if (departmentId) where.departmentId = departmentId;

      const goals = await prisma.goal.findMany({
        where,
        include: {
          department: true,
        },
        orderBy: { deadline: 'asc' },
      });
      return NextResponse.json(goals);
    } else {
      let goals = fallbackDb.getGoals();
      const departments = fallbackDb.getDepartments();

      if (departmentId) {
        goals = goals.filter((g: any) => g.departmentId === departmentId);
      }

      const enriched = goals.map((g: any) => ({
        ...g,
        department: departments.find((d: any) => d.id === g.departmentId),
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
    const { name, description, targetValue, unit, deadline, departmentId, imageData } = body;

    if (!name || !description || targetValue === undefined || !unit || !deadline) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (isOnline) {
      const newGoal = await prisma.goal.create({
        data: {
          name,
          description,
          targetValue: parseFloat(targetValue),
          unit,
          deadline: new Date(deadline),
          departmentId: departmentId || null,
          imageData: imageData || null, // Base64 image
          status: 'Active',
        },
      });
      return NextResponse.json(newGoal);
    } else {
      const newGoal = fallbackDb.createGoal({
        name,
        description,
        targetValue: parseFloat(targetValue),
        unit,
        deadline: new Date(deadline).toISOString(),
        departmentId: departmentId || null,
        imageData: imageData || null,
      });
      return NextResponse.json(newGoal);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
