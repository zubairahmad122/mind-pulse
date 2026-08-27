import { PatternGlyphView } from './PatternGlyphView';
import type { PatternDefinition } from '@/engine/core/games/patternShift';

export function PatternCanvas({ pattern, size = 112, emphasis = 'candidate', dimmed }: { pattern: PatternDefinition; size?: number; accent?: string; emphasis?: 'target'|'candidate'|'correct'; dimmed?: boolean }) {
  return <PatternGlyphView glyph={pattern} size={size} emphasis={emphasis} dimmed={dimmed}/>;
}
