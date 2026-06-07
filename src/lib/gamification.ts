export function getUserTier(completedTasksCount: number): string {
  if (completedTasksCount >= 50) return "Arbitrary Elite";
  if (completedTasksCount >= 25) return "Gold";
  if (completedTasksCount >= 10) return "Silver";
  return "Bronze";
}

export function getStreakMultiplier(currentStreak: number): number {
  if (currentStreak >= 30) return 1.5;
  if (currentStreak >= 7) return 1.2;
  return 1.0;
}
