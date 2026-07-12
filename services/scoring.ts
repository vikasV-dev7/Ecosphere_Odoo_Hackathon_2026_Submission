import { useConfigStore } from '@/stores/use-config-store';
import { useEnvironmentalStore } from '@/stores/use-environmental-store';
import { useSocialStore } from '@/stores/use-social-store';
import { useGovernanceStore } from '@/stores/use-governance-store';
import { useAuthStore } from '@/stores/use-auth-store';
import { useOrgStore } from '@/stores/use-org-store';
import { useGamificationStore } from '@/stores/use-gamification-store';

export interface ScoreExplanation {
  environmental: {
    score: number;
    carbonTotal: number;
    carbonDeduction: number;
    goalBonus: number;
    breakdown: string;
  };
  social: {
    score: number;
    participationRate: number;
    challengeCompletionRate: number;
    breakdown: string;
  };
  governance: {
    score: number;
    acknowledgementRate: number;
    auditAverage: number;
    penalty: number;
    breakdown: string;
  };
  weights: {
    environmental: number;
    social: number;
    governance: number;
  };
  total: number;
}

export class ScoringService {
  static calculateDepartmentScore(departmentId: string): {
    environmental: number;
    social: number;
    governance: number;
    total: number;
    carbonTotal: number;
  } {
    const explanation = this.explainScore(departmentId);
    return {
      environmental: Math.round(explanation.environmental.score),
      social: Math.round(explanation.social.score),
      governance: Math.round(explanation.governance.score),
      total: Math.round(explanation.total),
      carbonTotal: explanation.environmental.carbonTotal,
    };
  }

  static explainScore(departmentId: string): ScoreExplanation {
    const config = useConfigStore.getState().config;
    
    // 1. ENVIRONMENTAL SCORE CALCULATION
    const envStore = useEnvironmentalStore.getState();
    const carbonTransactions = envStore.carbonTransactions.filter((tx) => tx.departmentId === departmentId);
    const carbonTotal = carbonTransactions.reduce((sum, tx) => sum + tx.totalEmissions, 0);
    
    // Find goals for this department
    const deptGoals = envStore.goals.filter((g) => g.departmentId === departmentId);
    let targetBaseline = 5000; // default baseline if no goals configured
    let goalBonus = 0;
    
    deptGoals.forEach((goal) => {
      targetBaseline += goal.targetValue;
      if (goal.status === 'Completed') {
        goalBonus += 10;
      }
    });

    // Deduction: carbon vs baseline
    const carbonRatio = targetBaseline > 0 ? carbonTotal / targetBaseline : 0.5;
    const carbonDeduction = Math.min(50, carbonRatio * 30); // Max deduction 50 points
    
    let environmentalScore = 100 - carbonDeduction + goalBonus;
    environmentalScore = Math.max(0, Math.min(100, environmentalScore));

    const envBreakdown = `Base: 100. Carbon Total: ${carbonTotal.toFixed(1)} kg. Deduction: -${carbonDeduction.toFixed(1)} (based on baseline of ${targetBaseline} kg). Completed Goal Bonus: +${goalBonus}.`;

    // 2. SOCIAL SCORE CALCULATION
    const socialStore = useSocialStore.getState();
    const authStore = useAuthStore.getState();
    const deptEmployees = authStore.mockEmployees.filter((e) => e.departmentId === departmentId);
    const employeeIds = deptEmployees.map((e) => e.id);
    
    // Participation in CSR
    const participations = socialStore.participations.filter(
      (p) => employeeIds.includes(p.employeeId) && p.approvalStatus === 'Approved'
    );
    
    const participationRate = deptEmployees.length > 0 ? (participations.length / deptEmployees.length) * 100 : 80;

    // Challenge Completion
    const gamificationStore = useGamificationStore.getState();
    const chalParticipations = gamificationStore
      ? gamificationStore.participations.filter(
          (p: any) => employeeIds.includes(p.employeeId) && p.approvalStatus === 'Approved'
        )
      : [];
    
    const challengeCompletionRate = deptEmployees.length > 0 ? (chalParticipations.length / deptEmployees.length) * 100 : 75;

    let socialScore = (participationRate * 0.5) + (challengeCompletionRate * 0.5);
    socialScore = Math.max(0, Math.min(100, socialScore));

    const socBreakdown = `CSR Participation Rate: ${participationRate.toFixed(1)}% (Weight 50%). Challenge Completion Rate: ${challengeCompletionRate.toFixed(1)}% (Weight 50%).`;

    // 3. GOVERNANCE SCORE CALCULATION
    const govStore = useGovernanceStore.getState();
    
    // Policy acknowledgements for department employees
    const deptAcks = govStore.acknowledgements.filter((ack) => employeeIds.includes(ack.employeeId));
    const acknowledgedAcks = deptAcks.filter((ack) => ack.status === 'Acknowledged');
    const acknowledgementRate = deptAcks.length > 0 ? (acknowledgedAcks.length / deptAcks.length) * 100 : 100;

    // Audits average score
    const deptAudits = govStore.audits.filter((aud) => aud.departmentId === departmentId && aud.status === 'Completed');
    const auditAverage =
      deptAudits.length > 0
        ? deptAudits.reduce((sum, aud) => sum + (aud.score || 0), 0) / deptAudits.length
        : 85;

    // Compliance Issue penalties
    const deptIssues = govStore.complianceIssues.filter((issue) => {
      const audit = govStore.audits.find((a) => a.id === issue.auditId);
      return audit?.departmentId === departmentId;
    });

    let penalty = 0;
    deptIssues.forEach((issue) => {
      if (issue.status !== 'Resolved') {
        if (issue.severity === 'Low') penalty += 2;
        if (issue.severity === 'Medium') penalty += 5;
        if (issue.severity === 'High') penalty += 10;
        if (issue.severity === 'Critical') penalty += 20;
        
        if (issue.status === 'Overdue') {
          penalty += 10;
        }
      }
    });

    let governanceScore = (acknowledgementRate * 0.4) + (auditAverage * 0.6) - penalty;
    governanceScore = Math.max(0, Math.min(100, governanceScore));

    const govBreakdown = `Acknowledgement Rate: ${acknowledgementRate.toFixed(1)}% (Weight 40%). Audit Average Score: ${auditAverage.toFixed(1)}% (Weight 60%). Compliance Penalties: -${penalty} points.`;

    // 4. TOTAL ESG SCORE CALCULATION
    const envWeight = config.envWeight;
    const socialWeight = config.socialWeight;
    const govWeight = config.govWeight;

    const total =
      (environmentalScore * envWeight) +
      (socialScore * socialWeight) +
      (governanceScore * govWeight);

    return {
      environmental: {
        score: environmentalScore,
        carbonTotal,
        carbonDeduction,
        goalBonus,
        breakdown: envBreakdown,
      },
      social: {
        score: socialScore,
        participationRate,
        challengeCompletionRate,
        breakdown: socBreakdown,
      },
      governance: {
        score: governanceScore,
        acknowledgementRate,
        auditAverage,
        penalty,
        breakdown: govBreakdown,
      },
      weights: {
        environmental: envWeight,
        social: socialWeight,
        governance: govWeight,
      },
      total: Math.max(0, Math.min(100, total)),
    };
  }

  static getOrgOverviewScore() {
    const departments = useOrgStore.getState().departments;
    if (departments.length === 0) return { environmental: 80, social: 80, governance: 80, total: 80 };
    
    let envSum = 0;
    let socSum = 0;
    let govSum = 0;
    let totalSum = 0;

    departments.forEach((dept) => {
      const scores = this.calculateDepartmentScore(dept.id);
      envSum += scores.environmental;
      socSum += scores.social;
      govSum += scores.governance;
      totalSum += scores.total;
    });

    const count = departments.length;
    return {
      environmental: Math.round(envSum / count),
      social: Math.round(socSum / count),
      governance: Math.round(govSum / count),
      total: Math.round(totalSum / count),
    };
  }

  static simulateScore(params: {
    environmentalVal: number;
    socialVal: number;
    governanceVal: number;
  }): number {
    const config = useConfigStore.getState().config;
    const total =
      (params.environmentalVal * config.envWeight) +
      (params.socialVal * config.socialWeight) +
      (params.governanceVal * config.govWeight);
    return Math.round(total);
  }
}
