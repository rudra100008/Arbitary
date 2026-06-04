const MILESTONES: { days: number; bonus: number }[] = [
  { days: 5, bonus: 50 },
  { days: 7, bonus: 100 },
  { days: 30, bonus: 500 },
];

export function getMilestoneBonus(streak: number): number {
  for (const m of MILESTONES) {
    if (streak === m.days) return m.bonus;
  }
  return 0;
}

export function getNextMilestone(streak: number): { days: number; bonus: number } | null {
  for (const m of MILESTONES) {
    if (streak < m.days) return m;
  }
  return null;
}

export function toDateStr(d: unknown): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    const part = d.split("T")[0];
    if (!part || isNaN(new Date(part).getTime())) return null;
    return part;
  }
  if (d instanceof Date) {
    try { return d.toISOString().split("T")[0]; } catch { return null; }
  }
  return null;
}

export function calculateStreak(dailyLoginDate: Date | null, currentStreak: number): { newStreak: number; bonus: number } {
  if (!dailyLoginDate) return { newStreak: 1, bonus: 0 };

  const today = new Date();
  const todayStr = toDateStr(today);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  const dateStr = toDateStr(dailyLoginDate);

  if (dateStr === todayStr) {
    return { newStreak: currentStreak, bonus: 0 };
  }

  const newStreak = dateStr === yesterdayStr ? currentStreak + 1 : 1;
  return { newStreak, bonus: getMilestoneBonus(newStreak) };
}
