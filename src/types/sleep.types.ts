export interface SleepSchedule {
  uid: string;
  bedtime: string;
  wakeTime: string;
  duration: number;
  activeDays: string[];
  reminderEnabled: boolean;
  reminderMinutes: number;
  sleepNotesEnabled: boolean;
}

