export type Tier = {
  label: string;
  min: number;
  max: number;
  color: string;
};

export const TIERS: Tier[] = [
  { label: 'Iron',     min: 0,     max: 500,   color: '#9ca3af' },
  { label: 'Bronze',   min: 500,   max: 1500,  color: '#b45309' },
  { label: 'Silver',   min: 1500,  max: 3000,  color: '#cbd5e1' },
  { label: 'Gold',     min: 3000,  max: 6000,  color: '#FACC15' },
  { label: 'Platinum', min: 6000,  max: 10000, color: '#5eead4' },
  { label: 'Diamond',  min: 10000, max: 20000, color: '#60a5fa' },
];

export function getTier(points: number): Tier {
  return TIERS.findLast(t => points >= t.min) ?? TIERS[0];
}

export function getNextTier(points: number): Tier {
  const current = getTier(points);
  const idx = TIERS.indexOf(current);
  return TIERS[idx + 1] ?? current;
}

export function getRankLabel(points: number): string {
  return getTier(points).label;
}
