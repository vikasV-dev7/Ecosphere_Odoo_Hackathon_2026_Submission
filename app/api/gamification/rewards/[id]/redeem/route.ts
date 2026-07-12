import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fallbackDb } from '@/lib/db-fallback';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const isOnline = !!process.env.DATABASE_URL;
  const userEmail = req.headers.get('x-user-email') || 'alice@ecosphere.com';
  const { id: rewardId } = await params;

  try {
    if (isOnline) {
      const employee = await prisma.employee.findUnique({ where: { email: userEmail } });
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      // Execute atomic transaction
      const redemptionResult = await prisma.$transaction(async (tx) => {
        const reward = await tx.reward.findUnique({ where: { id: rewardId } });
        if (!reward) throw new Error('Reward product not found.');
        
        if (reward.stock <= 0) {
          throw new Error('This reward is currently out of stock.');
        }

        if (employee.totalPoints < reward.pointsRequired) {
          throw new Error(`Insufficient points. You need ${reward.pointsRequired} pts but only have ${employee.totalPoints} pts.`);
        }

        // 1. Decrement stock
        const nextStock = reward.stock - 1;
        const nextStatus = nextStock === 0 ? 'OutOfStock' : reward.status;
        await tx.reward.update({
          where: { id: rewardId },
          data: {
            stock: nextStock,
            status: nextStatus
          }
        });

        // 2. Decrement employee points
        await tx.employee.update({
          where: { id: employee.id },
          data: {
            totalPoints: { decrement: reward.pointsRequired }
          }
        });

        // 3. Create redemption record
        const redemption = await tx.rewardRedemption.create({
          data: {
            employeeId: employee.id,
            rewardId: reward.id,
            pointsSpent: reward.pointsRequired,
            status: 'Approved'
          }
        });

        // 4. Create notification
        await tx.notification.create({
          data: {
            employeeId: employee.id,
            type: 'badge_unlock',
            title: 'Reward Redeemed!',
            message: `You successfully redeemed "${reward.name}" for ${reward.pointsRequired} pts.`,
            read: false
          }
        });

        return redemption;
      });

      return NextResponse.json(redemptionResult);
    } else {
      const employee = fallbackDb.getEmployeeByEmail(userEmail);
      if (!employee) {
        return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
      }

      const redemption = fallbackDb.redeemReward(employee.id, rewardId);
      return NextResponse.json(redemption);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
