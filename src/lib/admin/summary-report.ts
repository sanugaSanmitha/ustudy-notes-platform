import type { VerificationAnalyticsData } from '@/components/admin/verification-analytics-charts';
import type { SummaryDatePreset } from '@/lib/grades/summary-date-range';

export type AdminSummaryCards = {
  totalVerifications: number;
  approved: number;
  rejected: number;
  pending: number;
  inReview: number;
  waitingStudent: number;
  escalated: number;
  approvalRate: number;
  rejectionRate: number;
  averageReviewTimeLabel: string;
  autoApproved: number;
  manualReviews: number;
};

export type AdminSummaryReport = {
  range: { preset: SummaryDatePreset; from: string | null; to: string };
  cards: AdminSummaryCards;
  analytics: VerificationAnalyticsData | null;
  pipeline: {
    uploaded: number;
    aiParsed: number;
    autoApproved: number;
    manualReview: number;
    approved: number;
    rejected: number;
  };
  riskDistribution: Array<{ level: string; label: string; value: number; percentage: number }>;
  queueTrend: Array<{ status: string; label: string; value: number }>;
  processingTime: {
    autoApproval: string;
    manualReview: string;
    waitingStudent: string;
    escalated: string;
  };
  topReviewers: Array<{
    id: string;
    name: string;
    casesReviewed: number;
    approvalRate: number;
    averageReviewTimeLabel: string;
  }>;
};
