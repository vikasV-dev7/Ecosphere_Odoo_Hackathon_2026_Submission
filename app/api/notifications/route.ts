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
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }

      const notifications = await prisma.notification.findMany({
        where: { employeeId: employee.id },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(notifications);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }

      const notifications = db.notifications.filter(
        (n: any) => n.employeeId === employee.id
      );

      // Sort by createdAt descending
      notifications.sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return NextResponse.json(notifications);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
