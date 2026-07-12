import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';
  const userEmail = req.headers.get('x-user-email') || '';

  try {
    if (isOnline) {
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
      });
      const employeeName = employee ? employee.name : '';

      const where: any = {};
      // Filter if normal employee
      if (userRole === 'Employee') {
        where.OR = [
          { owner: userEmail },
          { owner: { contains: employeeName } },
        ];
      }

      const issues = await prisma.complianceIssue.findMany({
        where,
        include: {
          audit: {
            include: { department: true },
          },
        },
        orderBy: { dueDate: 'asc' },
      });
      return NextResponse.json(issues);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      const employeeName = employee ? employee.name : '';

      let issues = db.complianceIssues;
      if (userRole === 'Employee') {
        issues = issues.filter(
          (i: any) =>
            i.owner === userEmail ||
            i.owner.toLowerCase().includes(employeeName.toLowerCase())
        );
      }

      const enriched = issues.map((i: any) => {
        const audit = db.audits.find((a: any) => a.id === i.auditId);
        const dept = audit ? db.departments.find((d: any) => d.id === audit.departmentId) : null;
        return {
          ...i,
          audit: audit ? { ...audit, department: dept } : null,
        };
      });

      return NextResponse.json(enriched);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
