import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET() {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    if (isOnline) {
      const factors = await prisma.emissionFactor.findMany({
        orderBy: { name: 'asc' },
      });
      return NextResponse.json(factors);
    } else {
      const factors = fallbackDb.getFactors();
      return NextResponse.json(factors);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';

  // Security gate: Admin only
  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { name, category, unit, factorValue, description } = body;

    if (!name || !category || !unit || factorValue === undefined) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    if (isOnline) {
      const factor = await prisma.emissionFactor.create({
        data: {
          name,
          category,
          unit,
          factorValue: parseFloat(factorValue),
          description: description || null,
          status: 'Active',
        },
      });
      return NextResponse.json(factor);
    } else {
      const factor = fallbackDb.createFactor({
        name,
        category,
        unit,
        factorValue: parseFloat(factorValue),
        description,
        status: 'Active',
      });
      return NextResponse.json(factor);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
