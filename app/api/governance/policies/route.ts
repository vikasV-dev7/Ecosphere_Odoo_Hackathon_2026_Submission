import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';

export async function GET(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';

  try {
    if (isOnline) {
      // Find employee
      const employee = await prisma.employee.findUnique({
        where: { email: userEmail },
      });
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }

      // Find policies
      const policies = await prisma.policy.findMany({
        where: { status: 'Active' },
        include: {
          acknowledgements: {
            where: { employeeId: employee.id },
          },
        },
        orderBy: { effectiveDate: 'desc' },
      });

      // Flatten acknowledgement status
      const mapped = policies.map((p) => {
        const ack = p.acknowledgements[0];
        return {
          id: p.id,
          title: p.title,
          content: p.content,
          version: p.version,
          effectiveDate: p.effectiveDate,
          status: p.status,
          ackStatus: ack ? ack.status : 'Pending',
          ackDate: ack ? ack.acknowledgedAt : null,
          dueDate: ack ? ack.dueDate : null,
        };
      });

      return NextResponse.json(mapped);
    } else {
      const db = getFallbackDb();
      const employee = db.employees.find((e: any) => e.email === userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee not found.' }, { status: 404 });
      }

      const activePolicies = db.policies.filter((p: any) => p.status === 'Active');
      const mapped = activePolicies.map((p: any) => {
        const ack = db.policyAcknowledgements.find(
          (a: any) => a.policyId === p.id && a.employeeId === employee.id
        );
        return {
          id: p.id,
          title: p.title,
          content: p.content,
          version: p.version,
          effectiveDate: p.effectiveDate,
          status: p.status,
          ackStatus: ack ? ack.status : 'Pending',
          ackDate: ack ? ack.acknowledgedAt : null,
          dueDate: ack ? ack.dueDate : null,
        };
      });

      return NextResponse.json(mapped);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;
  const userRole = req.headers.get('x-user-role') || 'Employee';

  // Gated: Admin only
  if (userRole !== 'Admin') {
    return NextResponse.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { title, content, version, effectiveDate, dueDateDays } = body;

    if (!title || !content || !version) {
      return NextResponse.json({ error: 'Missing required parameters.' }, { status: 400 });
    }

    const effective = effectiveDate ? new Date(effectiveDate) : new Date();
    const offset = dueDateDays ? parseInt(dueDateDays) : 30; // default 30 days
    const dueDate = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);

    if (isOnline) {
      const newPolicy = await prisma.policy.create({
        data: {
          title,
          content,
          version,
          effectiveDate: effective,
          status: 'Active',
        },
      });

      // Query all employees to assign
      const employees = await prisma.employee.findMany();

      // Create policy acknowledgements in batch
      await prisma.policyAcknowledgement.createMany({
        data: employees.map((emp) => ({
          policyId: newPolicy.id,
          employeeId: emp.id,
          dueDate,
          status: 'Pending',
          reminderSent: false,
        })),
      });

      // Dispatch policy_reminder/announcement notifications to everyone
      await prisma.notification.createMany({
        data: employees.map((emp) => ({
          employeeId: emp.id,
          type: 'policy_reminder',
          title: 'New Compliance Policy Assigned',
          message: `Please review and acknowledge "${title}" by ${dueDate.toLocaleDateString()}.`,
          read: false,
        })),
      });

      return NextResponse.json(newPolicy);
    } else {
      const db = getFallbackDb();

      const newPolicy = {
        id: `pol-${Math.random().toString(36).substr(2, 9)}`,
        title,
        content,
        version,
        effectiveDate: effective.toISOString(),
        status: 'Active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.policies.push(newPolicy);

      // Create acknowledgements
      db.employees.forEach((emp: any) => {
        db.policyAcknowledgements.push({
          id: `ack-${Math.random().toString(36).substr(2, 9)}`,
          policyId: newPolicy.id,
          employeeId: emp.id,
          dueDate: dueDate.toISOString(),
          status: 'Pending',
          reminderSent: false,
        });

        // Notifications
        db.notifications.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          employeeId: emp.id,
          type: 'policy_reminder',
          title: 'New Compliance Policy Assigned',
          message: `Please review and acknowledge "${title}" by ${dueDate.toLocaleDateString()}.`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      });

      saveFallbackDb(db);
      return NextResponse.json(newPolicy);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
