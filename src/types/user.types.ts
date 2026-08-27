export interface User {
  uid: string;
  name: string;
  email: string;
  username?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'prefer_not_to_say';
  sleepGoalHours: number;
  isPremium: boolean;
  createdAt: Date;
  streak: number;
  totalSessions: number;
}
