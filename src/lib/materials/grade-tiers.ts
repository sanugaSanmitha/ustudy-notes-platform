export type GradeTier = {
  tier: string;
  color: string;
  secondaryColor: string;
  label: string;
  badge: string;
};

const GRADE_TIERS: Record<string, GradeTier> = {
  'A+': {
    tier: 'platinum',
    color: '#E5E4E2',
    secondaryColor: '#C0A040',
    label: 'Gold Elite',
    badge: '👑',
  },
  A: {
    tier: 'gold',
    color: '#FFD700',
    secondaryColor: '#C0A040',
    label: 'Gold Standard',
    badge: '🌟',
  },
  'A-': {
    tier: 'silver_gold',
    color: '#C0C0C0',
    secondaryColor: '#C0A040',
    label: 'Silver with Gold Trim',
    badge: '⭐',
  },
  'B+': {
    tier: 'green_gold',
    color: '#50C878',
    secondaryColor: '#C0A040',
    label: 'Green with Gold Trim',
    badge: '💚',
  },
  B: {
    tier: 'green_silver',
    color: '#50C878',
    secondaryColor: '#C0C0C0',
    label: 'Green with Silver Trim',
    badge: '✅',
  },
  'B-': {
    tier: 'green_bronze',
    color: '#50C878',
    secondaryColor: '#CD7F32',
    label: 'Green with Bronze Trim',
    badge: '✔️',
  },
};

export function getGradeTier(grade: string): GradeTier {
  return GRADE_TIERS[grade] || GRADE_TIERS.B;
}

export function getGradeTierGradient(grade: string): string {
  const tier = getGradeTier(grade);
  return `linear-gradient(135deg, ${tier.color} 0%, ${tier.secondaryColor} 100%)`;
}
