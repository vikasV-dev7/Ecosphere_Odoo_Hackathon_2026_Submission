import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';
import { updateScorePipeline } from '@/app/api/scores/calculate/route';

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);

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
      const period = new Date().toISOString().substring(0, 7);
      await updateScorePipeline(departmentId, isOnline, period);    }

    return NextResponse.json(newTx);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

