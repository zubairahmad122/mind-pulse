export type Mood = 'calm' | 'good' | 'neutral' | 'sad' | 'stressed';

export type StressTrigger =
  | 'work'
  | 'sleep'
  | 'health'
  | 'relationships'
  | 'finance'
  | 'studies'
  | 'other';

export interface JournalEntry {
  id: string;
  uid: string;
  date: Date;
  mood: Mood;
  text: string;
  triggers: StressTrigger[];
  aiInsight?: string;
}
