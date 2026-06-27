export function useGreeting(name: string): string {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  return `Good ${period}, ${name}`;
}
