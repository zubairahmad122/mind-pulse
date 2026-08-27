import type { LucideIcon } from 'lucide-react-native';
import { ROUTES } from './routes';
import { PILLAR_COLORS } from './designSystem';
import { formatActivityDuration, getEyeActivity, getRecoverySession } from './eyeRelax';
import { Moon, Music, Eye, Heart, Grid3X3 } from 'lucide-react-native';

export type QuickAction = {
  id: string;
  label: string;
  description: string;
  accent: string;
  icon: LucideIcon;
  route: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { id: 'audio', label: 'Start Relax Session', description: 'Guided audio to unwind', accent: '#4FC3F7', icon: Music, route: '/(app)/(tabs)/relax' },
  { id: 'sleep', label: 'Sleep Analysis', description: 'Plan tonight & review rest', accent: '#a78bfa', icon: Moon, route: '/(app)/(tabs)/sleep?tab=tonight' },
  // The eye quick action wears the single Eyes-pillar cyan, matching every
  // eye card (was a mismatched green here).
  { id: 'eye', label: 'Eye Exercise', description: 'Reduce strain & refocus', accent: PILLAR_COLORS.eye, icon: Eye, route: '/(app)/(tabs)/eye-relax' },
  { id: 'stress', label: 'Breathing Exercise', description: 'Calm your nervous system', accent: '#FF6B9D', icon: Heart, route: ROUTES.appBoxBreathing },
  { id: 'mills', label: 'Play Mills', description: 'Local two-player strategy', accent: '#37D5D0', icon: Grid3X3, route: ROUTES.appMills },
];

export type PlanItem = { id: string; title: string; subtitle: string; emoji: string; route: string };

export function getDynamicPlan(worstArea: string): PlanItem[] {
  if (worstArea === 'Eyes') {
    // Title/duration/route come from the single eye-activity metadata
    // source so the home plan can never drift from the activity screens.
    const eyeReset = getRecoverySession('cvs-protocol')!;
    const focusSwitch = getEyeActivity('focus-sprint')!;
    return [
      { id: 'e1', title: eyeReset.title, subtitle: `${formatActivityDuration(eyeReset.durationSeconds)} · guided relaxation`, emoji: eyeReset.emoji, route: eyeReset.route },
      { id: 'e2', title: focusSwitch.title, subtitle: `${formatActivityDuration(focusSwitch.durationSeconds)} · near/far focus`, emoji: focusSwitch.emoji, route: focusSwitch.route },
    ];
  }
  if (worstArea === 'Sleep') return [
    { id: 's1', title: 'Set Bedtime Goal',  subtitle: '1 min · plan tonight',       emoji: '🌙', route: '/(app)/(tabs)/sleep?tab=routine' },
    { id: 's2', title: 'Sleep Story',       subtitle: '10 min · wind-down audio',   emoji: '📖', route: '/(app)/(tabs)/relax' },
    { id: 's3', title: 'Body Scan',         subtitle: '7 min · deep relaxation',    emoji: '🧘', route: '/(app)/stress/body-scan' },
  ];
  return [
    { id: 'm1', title: 'Box Breathing',  subtitle: '5 min · calm your system',      emoji: '🫁', route: ROUTES.appBoxBreathing },
    { id: 'm2', title: 'Journal Entry',  subtitle: '3 min · clear your mind',       emoji: '📓', route: '/(app)/stress/journal' },
    { id: 'm3', title: 'Grounding',      subtitle: '5 min · 5-4-3-2-1 technique',  emoji: '🌿', route: '/(app)/stress/grounding' },
  ];
}
