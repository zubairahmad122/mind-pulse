import { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Stop, Circle as SvgCircle, Path, Text as SvgText, Line } from 'react-native-svg';
import { COLORS } from '@/constants/colors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert HH:MM to a total-hours float (0–24). */
function toHours(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h + m / 60;
}

/** Format hours (float) to "HH:MM" 24-hour string. */
function formatHours(h: number): string {
  const clamped = ((h % 24) + 24) % 24;
  const hh = Math.floor(clamped);
  const mm = Math.round((clamped - hh) * 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function formatTimeAmPm(h: number): string {
  const clamped = ((h % 24) + 24) % 24;
  const totalMinutes = Math.round(clamped * 60);
  const hh24 = Math.floor(totalMinutes / 60) % 24;
  const mm = totalMinutes % 60;
  const hour12 = (hh24 % 12) || 12;
  const ampm = hh24 < 12 ? 'AM' : 'PM';
  return `${hour12}:${String(mm).padStart(2, '0')} ${ampm}`;
}

/** Convert total-hours (0–24) to radians (0 = top, clockwise). */
function hoursToRad(h: number): number {
  return h / 24 * Math.PI * 2;
}

/** Convert a touch angle back to total-hours (0–24). */
function radToHours(a: number): number {
  return ((a / (Math.PI * 2)) * 24 + 24) % 24;
}

/** Compute clockwise angleLength from bedtime to wakeTime in radians. */
function computeAngleLength(bedH: number, wakeH: number): number {
  const raw = (wakeH - bedH) / 24 * Math.PI * 2;
  return raw >= 0 ? raw : raw + Math.PI * 2;
}

/** Convert screen touch position to an angle in radians (0 = top, clockwise). */
function touchToAngle(touchX: number, touchY: number, centerX: number, centerY: number): number {
  let angle = Math.atan2(touchY - centerY, touchX - centerX);
  angle = angle + Math.PI / 2; // shift so 0 = top
  if (angle < 0) angle += 2 * Math.PI;
  return angle;
}

/** Clamp a value between min and max. */
function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  bedtime: string;  // "HH:MM"
  wakeTime: string; // "HH:MM"
  onChange: (bedtime: string, wakeTime: string) => void;
  size?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CircularSleepSlider({ bedtime, wakeTime, onChange, size = 280 }: Props) {
  const containerRef = useRef<View>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const bedH = toHours(bedtime);
  const wakeH = toHours(wakeTime);

  const startAngle = hoursToRad(bedH);
  const angleLength = computeAngleLength(bedH, wakeH);
  const endAngle = (startAngle + angleLength) % (2 * Math.PI);

  const rawDuration = wakeH >= bedH ? wakeH - bedH : wakeH + 24 - bedH;
  const totalDurationMin = Math.round(rawDuration * 60);
  const durationH = Math.floor(totalDurationMin / 60);
  const durationM = totalDurationMin % 60;

  const strokeWidth = Math.round(size * 0.11);
  const radius = Math.round((size - strokeWidth - 2) / 2);
  const center = size / 2;

  // Measure container position for touch -> angle conversion
  // Store dynamic values in refs so PanResponder callbacks always read fresh values
  const valsRef = useRef({
    absCenterX: 0,
    absCenterY: 0,
    bedH,
    rawDuration,
    bedtime,
    onChange,
  });
  valsRef.current = { absCenterX: origin.x + size / 2, absCenterY: origin.y + size / 2, bedH, rawDuration, bedtime, onChange };

  const measureOrigin = useCallback(() => {
    containerRef.current?.measureInWindow((x, y) => {
      setOrigin({ x, y });
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(measureOrigin, 150);
    return () => clearTimeout(timer);
  }, [measureOrigin]);

  // Re-measure on layout changes
  const onContainerLayout = useCallback(() => {
    measureOrigin();
  }, [measureOrigin]);

  // ── Bedtime (start) handle PanResponder ──────────────────────────────────
  // PanResponders are created once — they read dynamic values from valsRef
  const startPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const v = valsRef.current;
        if (v.absCenterX === 0 && v.absCenterY === 0) return;
        const newAngle = touchToAngle(gs.moveX, gs.moveY, v.absCenterX, v.absCenterY);
        const newBedH = radToHours(newAngle);
        const newWakeH = (newBedH + v.rawDuration) % 24;
        v.onChange(formatHours(newBedH), formatHours(newWakeH));
      },
      onPanResponderGrant: () => {
        measureOrigin();
      },
    }),
  ).current;

  const handleBedtimeTap = useCallback(() => {
    // Tap moves bedtime 30 min earlier — like the library's onPressIn
    const v = valsRef.current;
    const adv = (time: string, delta: number) => {
      const [h, m] = time.split(':').map(Number);
      const total = ((h * 60 + m + delta) % 1440 + 1440) % 1440;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    const earlier = adv(v.bedtime, -30);
    const newBedH = toHours(earlier);
    const newWakeH = (newBedH + v.rawDuration) % 24;
    v.onChange(earlier, formatHours(newWakeH));
  }, []);

  // ── Wake time (stop) handle PanResponder ─────────────────────────────────
  const stopPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gs) => {
        const v = valsRef.current;
        if (v.absCenterX === 0 && v.absCenterY === 0) return;
        const newAngle = touchToAngle(gs.moveX, gs.moveY, v.absCenterX, v.absCenterY);
        const newWakeH = radToHours(newAngle);

        const newDuration = newWakeH >= v.bedH ? newWakeH - v.bedH : newWakeH + 24 - v.bedH;
        // Min 30 min, max 16 hours
        if (newDuration >= 0.5 && newDuration <= 16) {
          v.onChange(v.bedtime, formatHours(newWakeH));
        }
      },
      onPanResponderGrant: () => {
        measureOrigin();
      },
    }),
  ).current;

  const handleWakeTap = useCallback(() => {
    // Tap moves wake 30 min later — like the library's onPressIn
    const v = valsRef.current;
    const adv = (time: string, delta: number) => {
      const [h, m] = time.split(':').map(Number);
      const total = ((h * 60 + m + delta) % 1440 + 1440) % 1440;
      return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };
    const wakeStr = formatHours((v.bedH + v.rawDuration) % 24);
    const later = adv(wakeStr, 30);
    v.onChange(v.bedtime, later);
  }, []);

  // Calculate handle positions on the circle
  const bedAngle = startAngle;
  const wakeAngle = endAngle;

  const bedX = center + radius * Math.sin(bedAngle);
  const bedY = center - radius * Math.cos(bedAngle);
  const wakeX = center + radius * Math.sin(wakeAngle);
  const wakeY = center - radius * Math.cos(wakeAngle);

  // ── Gradient segments for the arc ────────────────────────────────────────
  const SEGMENTS = 5;
  const gradientFrom = COLORS.purple;   // '#7B61FF'
  const gradientTo = COLORS.blue;       // '#4FC3F7'

  function arcSegment(index: number) {
    const fromRatio = index / SEGMENTS;
    const toRatio = (index + 1) / SEGMENTS;

    const fromAngle = startAngle + angleLength * fromRatio;
    const toAngle = startAngle + angleLength * toRatio;

    const fx = radius * Math.sin(fromAngle);
    const fy = -radius * Math.cos(fromAngle);
    const tx = radius * Math.sin(toAngle + 0.005);
    const ty = -radius * Math.cos(toAngle + 0.005);

    // Arc path
    const largeArc = (toAngle - fromAngle) > Math.PI ? 1 : 0;
    const d = `M ${(center + fx).toFixed(2)} ${(center + fy).toFixed(2)} A ${radius} ${radius} 0 ${largeArc} 1 ${(center + tx).toFixed(2)} ${(center + ty).toFixed(2)}`;

    // Gradient colors
    const interpolate = (t: number) => {
      // Simple RGB interpolation between purple and blue
      const pr = 0x7B, pg = 0x61, pb = 0xFF;
      const tr = 0x4F, tg = 0xC3, th = 0xF7;
      const r = Math.round(pr + (tr - pr) * t);
      const g = Math.round(pg + (tg - pg) * t);
      const b = Math.round(pb + (th - pb) * t);
      return `rgb(${r},${g},${b})`;
    };

    return (
      <G key={index}>
        <Defs>
          <LinearGradient id={`sleepGrad${index}`} x1={fx.toFixed(2)} y1={fy.toFixed(2)} x2={tx.toFixed(2)} y2={ty.toFixed(2)}>
            <Stop offset="0%" stopColor={interpolate(fromRatio)} />
            <Stop offset="100%" stopColor={interpolate(toRatio)} />
          </LinearGradient>
        </Defs>
        <Path
          d={d}
          stroke={`url(#sleepGrad${index})`}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="butt"
        />
      </G>
    );
  }

  return (
    <View className="items-center" style={{ width: size }}>
      {/* Touchable SVG Circle */}
      <View
        ref={containerRef}
        onLayout={onContainerLayout}
        collapsable={false}
      >
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track circle */}
          <SvgCircle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke="rgba(26, 21, 53, 0.5)"
            strokeWidth={strokeWidth}
          />

          {/* Clock Face - tick marks */}
          {Array.from({ length: 48 }, (_, i) => {
            const tickAngle = (i / 48) * Math.PI * 2;
            const isHour = i % 4 === 0;
            const innerR = radius - strokeWidth / 2 - (isHour ? 12 : 6);
            const outerR = radius - strokeWidth / 2 - 2;
            const x1 = center + innerR * Math.sin(tickAngle);
            const y1 = center - innerR * Math.cos(tickAngle);
            const x2 = center + outerR * Math.sin(tickAngle);
            const y2 = center - outerR * Math.cos(tickAngle);
            return (
              <Line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={isHour ? 2.5 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Clock Face - hour numbers */}
          {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour, i) => {
            const textAngle = (i / 12) * Math.PI * 2;
            const textR = radius - strokeWidth / 2 - 26;
            const tx = center + textR * Math.sin(textAngle);
            const ty = center - textR * Math.cos(textAngle);
            return (
              <SvgText
                key={i}
                x={tx}
                y={ty}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="rgba(255,255,255,0.3)"
              >
                {hour}
              </SvgText>
            );
          })}

          {/* Gradient arc segments */}
          {angleLength > 0.05 && Array.from({ length: SEGMENTS }, (_, i) => arcSegment(i))}

          {/* Wake time (stop) handle */}
          <G
            transform={`translate(${wakeX.toFixed(2)}, ${wakeY.toFixed(2)})`}
            onPress={handleWakeTap}
            {...stopPanResponder.panHandlers}
          >
            {/* Handle background circle */}
            <SvgCircle r={(strokeWidth - 2) / 2} fill="#0D1128" stroke={gradientTo} strokeWidth="2" />
            {/* Sun icon */}
            <SvgCircle cx={0} cy={0} r={5} fill={gradientTo} />
            {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
              const rad = (angle * Math.PI) / 180;
              const r1 = 7;
              const r2 = 10;
              return (
                <Line
                  key={angle}
                  x1={Math.sin(rad) * r1}
                  y1={-Math.cos(rad) * r1}
                  x2={Math.sin(rad) * r2}
                  y2={-Math.cos(rad) * r2}
                  stroke={gradientTo}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
          </G>

          {/* Bedtime (start) handle */}
          <G
            transform={`translate(${bedX.toFixed(2)}, ${bedY.toFixed(2)})`}
            onPress={handleBedtimeTap}
            {...startPanResponder.panHandlers}
          >
            {/* Handle background circle */}
            <SvgCircle r={(strokeWidth - 2) / 2} fill="#0D1128" stroke={gradientFrom} strokeWidth="2" />
            {/* Moon icon */}
            <Path
              d="M -4 -7 A 9 9 0 1 0 8 -1 C 8 -1 6 -5 0 -6 C -2 -6.5 -4 -7 -4 -7 Z"
              fill={gradientFrom}
            />
          </G>
        </Svg>
      </View>

      {/* Time labels below */}
      <View className="flex-row items-center justify-between w-full mt-3 px-2">
        <View className="items-center">
          {/* Moon indicator */}
          <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(157, 138, 255, 0.2)' }}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <Path
                d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.4 5.4 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8A9 9 0 0 0 12 3z"
                fill="#9d8aff"
              />
            </Svg>
          </View>
          <Text className="text-[9px] font-bold tracking-[1.5] uppercase mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Bedtime</Text>
          <Text className="text-[16px] font-bold mt-0.5" style={{ color: '#9d8aff' }}>{formatTimeAmPm(bedH)}</Text>
        </View>

        <View className="items-center">
          {/* Clock indicator */}
          <View className="w-7 h-7 rounded-full bg-white/10 items-center justify-center">
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <SvgCircle cx={12} cy={12} r={10} fill="transparent" stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} />
              <Line x1={12} y1={12} x2={12} y2={7} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={12} y1={12} x2={16} y2={14} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
          </View>
          <Text className="text-[9px] font-bold tracking-[1.5] text-white/40 uppercase mt-1">Duration</Text>
          <Text className="text-[14px] font-bold text-white/80 mt-0.5">
            {durationH}h {durationM > 0 ? `${durationM}m` : ''}
          </Text>
        </View>

        <View className="items-center">
          {/* Sun indicator */}
          <View className="w-7 h-7 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255, 152, 0, 0.2)' }}>
            <Svg width={14} height={14} viewBox="0 0 24 24">
              <SvgCircle cx={12} cy={12} r={5} fill="#FF9800" />
              <Line x1={12} y1={2} x2={12} y2={5} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={12} y1={19} x2={12} y2={22} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={2} y1={12} x2={5} y2={12} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={19} y1={12} x2={22} y2={12} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={4.9} y1={4.9} x2={7} y2={7} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={17} y1={17} x2={19.1} y2={19.1} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={4.9} y1={19.1} x2={7} y2={17} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
              <Line x1={17} y1={7} x2={19.1} y2={4.9} stroke="#FF9800" strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
          </View>
          <Text className="text-[9px] font-bold tracking-[1.5] uppercase mt-1" style={{ color: 'rgba(255, 255, 255, 0.4)' }}>Wake</Text>
          <Text className="text-[16px] font-bold mt-0.5" style={{ color: '#4FC3F7' }}>{formatTimeAmPm(wakeH)}</Text>
        </View>
      </View>

      {/* Drag hint */}
      <Text className="text-[10px] text-white/30 mt-2 text-center">
        Drag the 🌙 moon or ☀️ sun to set your sleep window
      </Text>
    </View>
  );
}
