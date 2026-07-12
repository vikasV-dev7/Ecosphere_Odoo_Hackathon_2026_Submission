import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb, getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const { id } = await params;

  // Permission Gate: Admin or Dept Head can update goal progress
  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { currentValue, imageData } = body;

    if (currentValue === undefined) {
      return NextResponse.json({ error: 'Missing currentValue parameter.' }, { status: 400 });
    }

    let updatedGoal;

    if (isOnline) {
      const goal = await prisma.goal.findUnique({
        where: { id },
      });

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
      }

      const nextVal = Math.min(goal.targetValue, Math.max(0, parseFloat(currentValue)));
      const status = nextVal >= goal.targetValue ? 'Completed' : 'Active';

      const updateData: any = {
        currentValue: nextVal,
        status,
      };

      if (imageData) {
        updateData.imageData = imageData;
      }

      updatedGoal = await prisma.goal.update({
        where: { id },
        data: updateData,
      });

      // Trigger scoring pipeline recalculation for department
      if (goal.departmentId) {
        await updateScorePipeline(goal.departmentId, isOnline);
      }
    } else {
      const goals = fallbackDb.getGoals();
      const goal = goals.find((g: any) => g.id === id);

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found.' }, { status: 404 });
      }

      const nextVal = Math.min(goal.targetValue, Math.max(0, parseFloat(currentValue)));
      const status = nextVal >= goal.targetValue ? 'Completed' : 'Active';

      const updates: any = { currentValue: nextVal, status };
      if (imageData) updates.imageData = imageData;

      updatedGoal = fallbackDb.updateGoalProgress(id, nextVal);
      if (imageData) {
        const db = getFallbackDb();
        db.goals = db.goals.map((g: any) => g.id === id ? { ...g, imageData } : g);
        saveFallbackDb(db);
        updatedGoal = { ...updatedGoal, imageData };
      }

      // Trigger scoring pipeline recalculation for department
      if (goal.departmentId) {
        await updateScorePipeline(goal.departmentId, isOnline);
      }
    }

    return NextResponse.json(updatedGoal);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Recalculation pipeline duplication (matching carbon trigger)
async function updateScorePipeline(departmentId: string, isOnline: boolean) {
  const period = new Date().toISOString().substring(0, 7);

  try {
    let carbonTotal = 0;
    let targetBaseline = 10000;

    if (isOnline) {
      const transactions = await prisma.carbonTransaction.findMany({
        where: { departmentId },
      });
      carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

      const goals = await prisma.goal.findMany({
        where: { departmentId, status: 'Active' },
      });
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
      }

      const environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      const existingScore = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
      });

      if (existingScore) {
        await prisma.departmentScore.update({
          where: { id: existingScore.id },
          data: {
            carbonTotal,
            environmentalScore,
            totalScore: environmentalScore * 0.4,
          },
        });
      } else {
        await prisma.departmentScore.create({
          data: {
            departmentId,
            period,
            environmentalScore,
            totalScore: environmentalScore * 0.4,
            carbonTotal,
          },
        });
      }
    } else {
      const transactions = fallbackDb.getTransactions().filter((t: any) => t.departmentId === departmentId);
      carbonTotal = transactions.reduce((sum: number, t: any) => sum + t.totalEmissions, 0);

      const goals = fallbackDb.getGoals().filter((g: any) => g.departmentId === departmentId && g.status === 'Active');
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum: number, g: any) => sum + g.targetValue, 0);
      }

      const environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      fallbackDb.upsertDepartmentScore({
        departmentId,
        period,
        environmentalScore,
        totalScore: environmentalScore * 0.4,
        carbonTotal,
      });
    }
  } catch (err) {
    console.error('Failed to update scoring pipeline:', err);
  }
}
