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
        include: { badges: true }
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      const badges = await prisma.badge.findMany();
      const enriched = badges.map((badge) => {
        const hasBadge = employee.badges.some((eb) => eb.badgeId === badge.id);
        return {
          ...badge,
          unlocked: hasBadge
        };
      });

      return NextResponse.json(enriched);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      const myBadges = db.employeeBadges.filter((eb: any) => eb.employeeId === employee.id);
      const enriched = db.badges.map((badge: any) => {
        const hasBadge = myBadges.some((eb: any) => eb.badgeId === badge.id);
        return {
          ...badge,
          unlocked: hasBadge
        };
      });

      return NextResponse.json(enriched);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
