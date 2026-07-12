import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const { searchParams } = new URL(req.url);
  const departmentId = searchParams.get('departmentId');
  const sourceType = searchParams.get('sourceType');

  try {
    if (isOnline) {
      const where: any = {};
      if (departmentId) where.departmentId = departmentId;
      if (sourceType) where.sourceType = sourceType;

      const transactions = await prisma.carbonTransaction.findMany({
        where,
        include: {
          emissionFactor: true,
          department: true,
        },
        orderBy: { date: 'desc' },
      });
      return NextResponse.json(transactions);
    } else {
      let transactions = fallbackDb.getTransactions();
      const factors = fallbackDb.getFactors();
      const departments = fallbackDb.getDepartments();

      if (departmentId) {
        transactions = transactions.filter((t: any) => t.departmentId === departmentId);
      }
      if (sourceType) {
        transactions = transactions.filter((t: any) => t.sourceType === sourceType);
      }

      // Map relation fields manually for fallback
      const enriched = transactions.map((t: any) => ({
        ...t,
        emissionFactor: factors.find((f: any) => f.id === t.emissionFactorId),
        department: departments.find((d: any) => d.id === t.departmentId),
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

  // Permission Gate: Admin or Department Head can log transactions
  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { departmentId, emissionFactorId, quantity, notes, date } = body;

    if (!departmentId || !emissionFactorId || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    let factorValue = 1;
    let sourceType = 'Purchase';
    let newTx;

    if (isOnline) {
      const factor = await prisma.emissionFactor.findUnique({
        where: { id: emissionFactorId },
      });
      if (!factor) {
        return NextResponse.json({ error: 'Emission factor not found.' }, { status: 404 });
      }
      factorValue = factor.factorValue;
      sourceType = factor.category;

      const totalEmissions = parseFloat(quantity) * factorValue;

      newTx = await prisma.carbonTransaction.create({
        data: {
          departmentId,
          emissionFactorId,
          sourceType,
          quantity: parseFloat(quantity),
          totalEmissions,
          notes: notes || null,
          date: date ? new Date(date) : new Date(),
          autoCalculated: true,
        },
        include: {
          emissionFactor: true,
        },
      });

      // Trigger score pipeline calculation in background
      await updateScorePipeline(departmentId, isOnline);

    } else {
      const factors = fallbackDb.getFactors();
      const factor = factors.find((f: any) => f.id === emissionFactorId);
      if (!factor) {
        return NextResponse.json({ error: 'Emission factor not found.' }, { status: 404 });
      }
      factorValue = factor.factorValue;
      sourceType = factor.category;

      newTx = fallbackDb.createTransaction({
        departmentId,
        emissionFactorId,
        sourceType,
        quantity: parseFloat(quantity),
        notes,
        date: date || new Date().toISOString(),
        autoCalculated: true,
      });

      const enriched = {
        ...newTx,
        emissionFactor: factor,
        department: fallbackDb.getDepartments().find((d: any) => d.id === departmentId),
      };
      newTx = enriched;

      // Trigger score pipeline calculation in background
      await updateScorePipeline(departmentId, isOnline);
    }

    return NextResponse.json(newTx);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Score recalculation helper validating the pipeline
async function updateScorePipeline(departmentId: string, isOnline: boolean) {
  const period = new Date().toISOString().substring(0, 7); // YYYY-MM

  try {
    let carbonTotal = 0;
    let targetBaseline = 10000; // default baseline

    if (isOnline) {
      // 1. Get total emissions for department this month
      const transactions = await prisma.carbonTransaction.findMany({
        where: { departmentId },
      });
      carbonTotal = transactions.reduce((sum, t) => sum + t.totalEmissions, 0);

      // 2. Get active goals
      const goals = await prisma.goal.findMany({
        where: { departmentId, status: 'Active' },
      });
      if (goals.length > 0) {
        targetBaseline = goals.reduce((sum, g) => sum + g.targetValue, 0);
      }

      // 3. Compute Environmental Score
      const environmentalScore = Math.max(0, Math.min(100, 100 - (carbonTotal / targetBaseline * 100)));

      // 4. Upsert DepartmentScore
      const existingScore = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
      });

      if (existingScore) {
        await prisma.departmentScore.update({
          where: { id: existingScore.id },
          data: {
            carbonTotal,
            environmentalScore,
            totalScore: environmentalScore * 0.4, // Environment weight is 40%
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
