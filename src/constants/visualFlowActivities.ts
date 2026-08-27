/**
 * Visual Flow V1 — one coherent guided session (Infinity Flow → Wave Flow →
 * Target Switch → Sweep Flow), plus solo launches of any single activity.
 * Infinity Flow and Target Switch expose existing, already-built Guide
 * animations (`FigureEightGuide`, `SaccadeGuide`) unmodified; Wave Flow and
 * Sweep Flow are the only net-new animation components.
 */
export type VisualFlowId = 'infinity-flow' | 'wave-flow' | 'target-switch' | 'sweep-flow';

export interface VisualFlowActivity {
  id: VisualFlowId;
  title: string;
  /** Short in-session instruction shown under the title. */
  instruction: string;
  durationSeconds: number;
  description: string;
  steps: string[];
}

export const VISUAL_FLOW_ACTIVITIES: Record<VisualFlowId, VisualFlowActivity> = {
  'infinity-flow': {
    id: 'infinity-flow',
    title: 'Infinity Flow',
    instruction: 'Follow the target smoothly.',
    durationSeconds: 45,
    description: 'A smooth figure-eight path for your eyes to trace.',
    steps: [
      'Keep your head still.',
      'Let your eyes trace the glowing path.',
      'Follow at a comfortable, steady pace.',
      'Stop if you notice strain or discomfort.',
    ],
  },
  'wave-flow': {
    id: 'wave-flow',
    title: 'Wave Flow',
    instruction: 'Follow the wave from side to side.',
    durationSeconds: 40,
    description: 'A calm flowing wave path moving side to side.',
    steps: [
      'Keep your head still.',
      'Let your eyes ride the wave from side to side.',
      'Move at a comfortable, steady pace.',
      'Stop if you notice strain or discomfort.',
    ],
  },
  'target-switch': {
    id: 'target-switch',
    title: 'Target Switch',
    instruction: 'Shift between the glowing targets.',
    durationSeconds: 45,
    description:
      'Shift your focus between two targets at a comfortable pace — the same movement used in Eye Reset’s Quick Focus step.',
    steps: [
      'Keep your head still.',
      'Move your eyes between the two glowing dots.',
      'Shift focus smoothly, not by straining.',
      'Stop if you notice strain or discomfort.',
    ],
  },
  'sweep-flow': {
    id: 'sweep-flow',
    title: 'Sweep Flow',
    instruction: 'Follow the target as it sweeps across.',
    durationSeconds: 40,
    description: 'A broad, steady sweep across the full width of the canvas.',
    steps: [
      'Keep your head still.',
      'Follow the target as it sweeps side to side.',
      'Let your eyes move smoothly, not by jumping ahead.',
      'Stop if you notice strain or discomfort.',
    ],
  },
};

/** The default 4-activity guided sequence — alternates movement styles. */
export const VISUAL_FLOW_DEFAULT_SEQUENCE: VisualFlowId[] = [
  'infinity-flow',
  'wave-flow',
  'target-switch',
  'sweep-flow',
];

export function getVisualFlowActivity(id: string): VisualFlowActivity | undefined {
  return VISUAL_FLOW_ACTIVITIES[id as VisualFlowId];
}

export function totalVisualFlowSeconds(ids: VisualFlowId[]): number {
  return ids.reduce((sum, id) => sum + VISUAL_FLOW_ACTIVITIES[id].durationSeconds, 0);
}
