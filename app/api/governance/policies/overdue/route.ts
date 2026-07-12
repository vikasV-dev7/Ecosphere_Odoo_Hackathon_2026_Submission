import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';

  // Gated: Admin or Dept Head
  if (userRole !== 'Admin' && userRole !== 'DepartmentHead') {
    return NextResponse.json({ error: 'Unauthorized. Higher privilege required.' }, { status: 403 });
  }

  try {
    const now = new Date();

    if (isOnline) {
      const overdue = await prisma.policyAcknowledgement.findMany({
        where: {
          status: 'Pending',
          dueDate: { lt: now },
        },
        include: {
          policy: true,
          employee: {
            include: { department: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
      return NextResponse.json(overdue);
    } else {
      const db = getFallbackDb();
      const overdueAcks = db.policyAcknowledgements.filter(
        (a: any) => a.status === 'Pending' && new Date(a.dueDate).getTime() < now.getTime()
      );

      const enriched = overdueAcks.map((a: any) => {
        const employee = db.employees.find((e: any) => e.id === a.employeeId);
        const dept = employee ? db.departments.find((d: any) => d.id === employee.departmentId) : null;
        return {
          ...a,
          policy: db.policies.find((p: any) => p.id === a.policyId),
          employee: employee ? { ...employee, department: dept } : null,
        };
      });

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
