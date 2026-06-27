// ──────────────────────────────────────────────────────────────────────────────
// MPSleepClock — Circular 24-hour clock showing sleep window arc
// Icons rendered inside SVG via foreignObject to avoid coordinate mismatch.
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, Path, Text as SvgText, ForeignObject } from 'react-native-svg';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SIZES } from '@/theme';

interface Props {
  bedtime: string;
  wakeTime: string;
  sleepHours: number;
}

function parseTime(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

function clockArc(cx: number, cy: number, r: number, startHour: number, endHour: number): string {
  const startAngle = (startHour / 24) * 360 - 90;
  const endAngle = (endHour / 24) * 360 - 90;
  const sweep = endAngle - startAngle;
  const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
  const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
  const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
  const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2}`;
}

const TICK_HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

export const MPSleepClock = React.memo(function MPSleepClock({
  bedtime,
  wakeTime,
  sleepHours,
}: Props) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 48, 280);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 24;

  const bedHour = parseTime(bedtime);
  const wakeHour = parseTime(wakeTime);
  const endHour = wakeHour <= bedHour ? wakeHour + 24 : wakeHour;
  const arcPath = clockArc(cx, cy, radius, bedHour, endHour);

  const labelR = radius + 14;

  // Calculate icon positions (in SVG coordinates, used in foreignObject)
  const bedAngle = (bedHour / 24) * 360 - 90;
  const bedRad = (bedAngle * Math.PI) / 180;
  const bedX = cx + radius * Math.cos(bedRad);
  const bedY = cy + radius * Math.sin(bedRad);

  const wakeAngle = (endHour / 24) * 360 - 90;
  const wakeRad = (wakeAngle * Math.PI) / 180;
  const wakeX = cx + radius * Math.cos(wakeRad);
  const wakeY = cy + radius * Math.sin(wakeRad);

  return (
    <View
      style={{ alignItems: 'center', gap: 16 }}
      accessibilityRole="image"
      accessibilityLabel={`Sleep clock: bedtime ${bedtime}, wake time ${wakeTime}, ${sleepHours} hours of sleep`}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="sleepArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={COLORS.purple} />
            <Stop offset="100%" stopColor={COLORS.blue} />
          </LinearGradient>
        </Defs>

        {/* Background ring */}
        <Circle cx={cx} cy={cy} r={radius} fill="none" stroke={COLORS.elevated} strokeWidth={6} />

        {/* Hour tick labels */}
        {TICK_HOURS.map((h) => {
          const angle = (h / 24) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          return (
            <SvgText
              key={h}
              x={cx + labelR * Math.cos(rad)}
              y={cy + labelR * Math.sin(rad)}
              fill={COLORS.textMuted}
              fontSize={10}
              textAnchor="middle"
              alignmentBaseline="central"
            >
              {h}
            </SvgText>
          );
        })}

        {/* Sleep arc */}
        <Path d={arcPath} fill="none" stroke="url(#sleepArcGrad)" strokeWidth={6} strokeLinecap="round" />

        {/* Moon icon at bedtime (inside SVG via foreignObject) */}
        <ForeignObject x={bedX - 12} y={bedY - 12} width={24} height={24}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MPIcon name="Moon" size="sm" color="purple" />
          </View>
        </ForeignObject>

        {/* Sun icon at wake time (inside SVG via foreignObject) */}
        <ForeignObject x={wakeX - 12} y={wakeY - 12} width={24} height={24}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MPIcon name="Sun" size="sm" color="gold" />
          </View>
        </ForeignObject>

        {/* Center duration */}
        <SvgText x={cx} y={cy - 8} fill={COLORS.textPrimary} fontSize={24} fontWeight="700" textAnchor="middle">
          {sleepHours.toFixed(1)}h
        </SvgText>
        <SvgText x={cx} y={cy + 14} fill={COLORS.textSecondary} fontSize={11} textAnchor="middle">
          sleep window
        </SvgText>
      </Svg>

      {/* Labels below clock */}
      <View style={{ flexDirection: 'row', gap: 32, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MPIcon name="Moon" size="xs" color="purple" />
          <MPText variant="body-sm" color="secondary">{bedtime}</MPText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MPIcon name="Sun" size="xs" color="gold" />
          <MPText variant="body-sm" color="secondary">{wakeTime}</MPText>
        </View>
      </View>
    </View>
  );
});
