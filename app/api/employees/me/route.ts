import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';

  try {
    if (isOnline) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
        include: {
          department: true,
        },
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }
      return NextResponse.json(employee);
    } else {
      const employee = fallbackDb.getEmployeeByEmail(userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }
      
      const dept = fallbackDb.getDepartments().find((d: any) => d.id === employee.departmentId);
      return NextResponse.json({
        ...employee,
        department: dept,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
