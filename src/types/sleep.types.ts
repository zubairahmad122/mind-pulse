export interface SleepSchedule {
  uid: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  activeDays: string[];
  reminderEnabled: boolean;
  reminderMinutes: number;
}

export interface SleepSessionRecord {
  id: string;
  uid: string;
  date: Date;
  sleepTime: string;
  wakeTime: string;
  duration: number;
  score: number;
}
