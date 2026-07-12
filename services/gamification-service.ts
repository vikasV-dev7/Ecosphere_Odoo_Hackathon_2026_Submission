import { prisma } from '@/lib/prisma';
import { getFallbackDb, saveFallbackDb } from '@/lib/db-fallback';
import { updateScorePipeline } from '@/app/api/scores/calculate/route';

/**
 * Checks if two dates are the same calendar day.
 */
function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Checks if d2 is exactly the day before d1.
 */
function isYesterday(d1: Date, d2: Date): boolean {
  const diffTime = d1.getTime() - d2.getTime();
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays >= 0.5 && diffDays < 1.9; // robust relative day check
}

/**
 * Increment or reset employee's streak based on daily activity.
 */
export async function updateStreak(employeeId: string, isOnline: boolean) {
  const now = new Date();

  if (isOnline) {
    const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return;

    let newStreak = employee.streakDays;
    const lastDate = employee.lastActivityDate ? new Date(employee.lastActivityDate) : null;

    if (lastDate) {
      if (isSameDay(now, lastDate)) {
        // Already did an action today, streak is safe
        return;
      } else if (isYesterday(now, lastDate)) {
        // Consecutive day!
        newStreak += 1;
      } else {
        // Over 48 hours or broke streak - reset to 1
        newStreak = 1;
      }
    } else {
      // First action ever
      newStreak = 1;
    }

    const longestStreak = Math.max(employee.longestStreak, newStreak);

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        streakDays: newStreak,
        longestStreak,
        lastActivityDate: now,
      },
    });
  } else {
    const db = getFallbackDb();
    const employeeIndex = db.employees.findIndex((e: any) => e.id === employeeId);
    if (employeeIndex < 0) return;

    const employee = db.employees[employeeIndex];
    let newStreak = employee.streakDays || 0;
    const lastDate = employee.lastActivityDate ? new Date(employee.lastActivityDate) : null;

    if (lastDate) {
      if (isSameDay(now, lastDate)) {
        return;
      } else if (isYesterday(now, lastDate)) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const longestStreak = Math.max(employee.longestStreak || 0, newStreak);

    db.employees[employeeIndex] = {
      ...employee,
      streakDays: newStreak,
      longestStreak,
      lastActivityDate: now.toISOString(),
    };
    saveFallbackDb(db);
  }
}

/**
 * Checks and auto-awards badges to the employee.
 * Runs recursively if XP changes to trigger secondary unlocks.
 */
export async function checkBadgeEligibility(employeeId: string, isOnline: boolean) {
  if (isOnline) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        badges: true,
      },
    });
    if (!employee) return;

    const badges = await prisma.badge.findMany();
    const completedChallengesCount = await prisma.challengeParticipation.count({
      where: { employeeId, approvalStatus: 'Approved' },
    });

    let awardGiven = false;

    for (const badge of badges) {
      const alreadyUnlocked = employee.badges.some((b) => b.badgeId === badge.id);
      if (alreadyUnlocked) continue;

      let isEligible = false;

      switch (badge.ruleType) {
        case 'xp_threshold':
          isEligible = employee.xp >= badge.ruleValue;
          break;
        case 'challenges_completed':
          isEligible = completedChallengesCount >= badge.ruleValue;
          break;
        case 'streak_days':
          isEligible = employee.streakDays >= badge.ruleValue;
          break;
      }

      if (isEligible) {
        awardGiven = true;
        // Award badge
        await prisma.employeeBadge.create({
          data: {
            employeeId,
            badgeId: badge.id,
          },
        });

        // Award XP Bonus
        await prisma.employee.update({
          where: { id: employeeId },
          data: { xp: { increment: badge.xpBonus } },
        });

        // Dispatch Notification
        await prisma.notification.create({
          data: {
            employeeId,
            type: 'badge_unlock',
            title: `Badge Unlocked: ${badge.name}!`,
            message: `Congratulations! You unlocked the "${badge.name}" badge and received +${badge.xpBonus} bonus XP!`,
            read: false,
          },
        });
      }
    }

    // Recursively check if the newly added XP triggered any other thresholds
    if (awardGiven) {
      await checkBadgeEligibility(employeeId, isOnline);
    }
  } else {
    const db = getFallbackDb();
    const employeeIndex = db.employees.findIndex((e: any) => e.id === employeeId);
    if (employeeIndex < 0) return;

    const employee = db.employees[employeeIndex];
    const myBadges = db.employeeBadges.filter((eb: any) => eb.employeeId === employeeId);
    const completedChallengesCount = db.challengeParticipations.filter(
      (cp: any) => cp.employeeId === employeeId && cp.approvalStatus === 'Approved'
    ).length;

    let awardGiven = false;

    for (const badge of db.badges) {
      const alreadyUnlocked = myBadges.some((b: any) => b.badgeId === badge.id);
      if (alreadyUnlocked) continue;

      let isEligible = false;

      switch (badge.ruleType) {
        case 'xp_threshold':
          isEligible = employee.xp >= badge.ruleValue;
          break;
        case 'challenges_completed':
          isEligible = completedChallengesCount >= badge.ruleValue;
          break;
        case 'streak_days':
          isEligible = employee.streakDays >= badge.ruleValue;
          break;
      }

      if (isEligible) {
        awardGiven = true;
        db.employeeBadges.push({
          id: `eb-${Math.random().toString(36).substr(2, 9)}`,
          employeeId,
          badgeId: badge.id,
          createdAt: new Date().toISOString(),
        });

        // Update employee XP
        db.employees[employeeIndex] = {
          ...employee,
          xp: employee.xp + badge.xpBonus,
        };

        // Create Notification
        db.notifications.push({
          id: `notif-${Math.random().toString(36).substr(2, 9)}`,
          employeeId,
          type: 'badge_unlock',
          title: `Badge Unlocked: ${badge.name}!`,
          message: `Congratulations! You unlocked the "${badge.name}" badge and received +${badge.xpBonus} bonus XP!`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (awardGiven) {
      saveFallbackDb(db);
      await checkBadgeEligibility(employeeId, isOnline);
    }
  }
}

/**
 * Wraps any daily sustainability action to maintain streak, check badges, and recalculate scores.
 */
export async function registerEsgAction(employeeId: string, departmentId: string) {
  const isOnline = !!process.env.DATABASE_URL;

  // 1. Maintain Streak
  await updateStreak(employeeId, isOnline);

  // 2. Auto-award Badges
  await checkBadgeEligibility(employeeId, isOnline);

  // 3. Recalculate scoring pipeline
  await updateScorePipeline(departmentId, isOnline);
}
