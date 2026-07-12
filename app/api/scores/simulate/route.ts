import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getFallbackDb } from '@/lib/db-fallback';

const simulatorSchema = z.object({
  departmentId: z.string(),
  carbonReductionPct: z.number().min(-50).max(100),
  csrParticipationBoost: z.number().min(0).max(100),
  policyAckRate: z.number().min(0).max(100),
  auditScore: z.number().min(0).max(100),
});

export async function POST(req: Request) {
  const isOnline = !!process.env.DATABASE_URL;

  try {
    const body = await req.json();
    const parsed = simulatorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.issues }, { status: 400 });
    }

    const { departmentId, carbonReductionPct, csrParticipationBoost, policyAckRate, auditScore } = parsed.data;

    let envWeight = 0.4;
    let socialWeight = 0.3;
    let govWeight = 0.3;

    if (isOnline) {
      const config = await prisma.eSGConfig.findFirst();
      if (config) {
        envWeight = config.envWeight;
        socialWeight = config.socialWeight;
        govWeight = config.govWeight;
      }
    } else {
      const db = getFallbackDb();
      if (db.configs && db.configs.length > 0) {
        envWeight = db.configs[0].envWeight;
        socialWeight = db.configs[0].socialWeight;
        govWeight = db.configs[0].govWeight;
      }
    }

    const period = new Date().toISOString().substring(0, 7);
    
    // Fetch current breakdowns to apply deltas
    let currentScore: any = null;
    let breakdowns: any[] = [];

    if (isOnline) {
      currentScore = await prisma.departmentScore.findFirst({
        where: { departmentId, period },
      });
      if (currentScore) {
        breakdowns = await prisma.scoreBreakdown.findMany({
          where: { departmentScoreId: currentScore.id },
        });
      }
    } else {
      const db = getFallbackDb();
      currentScore = db.departmentScores.find((s: any) => s.departmentId === departmentId && s.period === period);
      if (currentScore) {
        breakdowns = (db.scoreBreakdowns || []).filter((b: any) => b.departmentScoreId === currentScore.id);
      }
    }

    if (!currentScore) {
      return NextResponse.json({ error: 'Current score not found for department.' }, { status: 404 });
    }

    const getMetric = (name: string, fallback: number) => {
      const bd = breakdowns.find((b: any) => b.metricName === name);
      return bd ? bd.metricValue : fallback;
    };

    // --- SIMULATED ENVIRONMENTAL ---
    const currentCarbonRatio = getMetric('carbon_vs_goal', 1.0);
    // reduction of 10% means carbonRatio becomes carbonRatio * 0.9
    const simulatedCarbonRatio = currentCarbonRatio * (1 - (carbonReductionPct / 100));
    const envDeduction = simulatedCarbonRatio * 100;
    const simEnvScore = Math.max(0, Math.min(100, 100 - envDeduction));

    // --- SIMULATED SOCIAL ---
    const currentCsrRate = getMetric('csr_participation_rate', 0);
    const simCsrRate = Math.min(100, currentCsrRate + csrParticipationBoost);
    const currentChallengeRate = getMetric('challenge_completion_rate', 100);
    const simSocialScore = (simCsrRate * 0.6) + (currentChallengeRate * 0.4);

    // --- SIMULATED GOVERNANCE ---
    const currentPenalty = getMetric('compliance_penalty', 0);
    const simGovScore = Math.max(0, (policyAckRate * 0.4) + (auditScore * 0.6) - currentPenalty);

    // --- SIMULATED TOTAL ---
    const simTotalScore = (simEnvScore * envWeight) + (simSocialScore * socialWeight) + (simGovScore * govWeight);

    return NextResponse.json({
      current: {
        environmentalScore: currentScore.environmentalScore,
        socialScore: currentScore.socialScore,
        governanceScore: currentScore.governanceScore,
        totalScore: currentScore.totalScore,
      },
      simulated: {
        environmentalScore: simEnvScore,
        socialScore: simSocialScore,
        governanceScore: simGovScore,
        totalScore: simTotalScore,
      }
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
