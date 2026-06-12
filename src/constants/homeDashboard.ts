import type { LucideIcon } from 'lucide-react-native';
import { Moon, Music, Eye, Heart } from 'lucide-react-native';

export type QuickAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  route: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'sleep', label: 'Start Sleep', icon: Moon, route: '/(app)/(tabs)/sleep?tab=tonight' },
  { id: 'audio', label: 'Guided Audio', icon: Music, route: '/(app)/(tabs)/relax' },
  { id: 'eye', label: 'Eye Relax', icon: Eye, route: '/(app)/(tabs)/eye-relax' },
  { id: 'stress', label: 'Stress Relief', icon: Heart, route: '/(app)/(tabs)/relax' },
];

export type PlanItem = { id: string; title: string; subtitle: string; emoji: string; route: string };

export function getDynamicPlan(worstArea: string): PlanItem[] {
  if (worstArea === 'Eyes') return [
    { id: 'e1', title: 'Eye Reset Protocol', subtitle: '3 min · guided recovery',   emoji: '👁️', route: '/(app)/cvs-protocol' },
    { id: 'e2', title: 'Comet Trace',        subtitle: '60 sec · smooth pursuit',   emoji: '☄️', route: '/(app)/eye-game/comet-trace' },
    { id: 'e3', title: 'Saccade Sniper',     subtitle: '60 sec · reflex training',  emoji: '🎯', route: '/(app)/eye-game/saccade-sniper' },
  ];
  if (worstArea === 'Sleep') return [
    { id: 's1', title: 'Set Bedtime Goal',  subtitle: '1 min · plan tonight',       emoji: '🌙', route: '/(app)/(tabs)/sleep?tab=routine' },
    { id: 's2', title: 'Sleep Story',       subtitle: '10 min · wind-down audio',   emoji: '📖', route: '/(app)/(tabs)/relax' },
    { id: 's3', title: 'Body Scan',         subtitle: '7 min · deep relaxation',    emoji: '🧘', route: '/(app)/stress/body-scan' },
  ];
  return [
    { id: 'm1', title: 'Box Breathing',  subtitle: '5 min · calm your system',      emoji: '🫁', route: '/(app)/stress/box-breathing' },
    { id: 'm2', title: 'Journal Entry',  subtitle: '3 min · clear your mind',       emoji: '📓', route: '/(app)/stress/journal' },
    { id: 'm3', title: 'Grounding',      subtitle: '5 min · 5-4-3-2-1 technique',  emoji: '🌿', route: '/(app)/stress/grounding' },
  ];
}

export const DAILY_TIP =
  'Dim screens 60 minutes before bed — your brain needs darkness to release melatonin naturally.';

export const AI_SLEEP_RECOMMENDATION =
  'Based on your pattern, try sleeping at 11:00 PM and waking at 6:30 AM for ~7.5 hours of rest.';
