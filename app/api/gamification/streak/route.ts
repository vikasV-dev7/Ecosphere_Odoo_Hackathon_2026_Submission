import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';

  try {
    if (isOnline) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
        select: {
          streakDays: true,
          longestStreak: true,
          lastActivityDate: true
        }
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      return NextResponse.json(employee);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      return NextResponse.json({
        streakDays: employee.streakDays || 0,
        longestStreak: employee.longestStreak || 0,
        lastActivityDate: employee.lastActivityDate || null
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
