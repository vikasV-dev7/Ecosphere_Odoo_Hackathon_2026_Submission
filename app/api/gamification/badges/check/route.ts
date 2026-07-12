import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';
import { checkBadgeEligibility } from '@/services/gamification-service';

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';

  try {
    let employeeId = '';

    if (isOnline) {
      const employee = await prisma.employee.findUnique({ where: { email: userEmail } });
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }
      employeeId = employee.id;
    }

    await checkBadgeEligibility(employeeId, isOnline);

    return NextResponse.json({ status: 'success', message: 'Badge eligibility check completed successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
