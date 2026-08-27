export function streakEncouragementMessage(streak: number): string {
  if (streak === 0) return 'Log a session to start your streak!';
  if (streak >= 30) return "You're a sleep champion! 🏆";
  if (streak >= 7) return 'Incredible week! Keep it up 💫';
  return 'Building a great habit. Keep going!';
}
