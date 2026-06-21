import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { rs } from '@/utils/responsive';

const ICON_PATHS = {
  brain: 'M12 4a4 4 0 0 0-3.5 2.1A4 4 0 0 0 5 10c0 .7.2 1.4.5 2A4 4 0 0 0 3 15.5a4 4 0 0 0 4 4c.5 0 1-.1 1.5-.3A4 4 0 0 0 12 22a4 4 0 0 0 3.5-2.8c.5.2 1 .3 1.5.3a4 4 0 0 0 4-4 4 4 0 0 0-2.5-3.5c.3-.6.5-1.3.5-2a4 4 0 0 0-3.5-3.9A4 4 0 0 0 12 4Z M12 17v-5 M12 8h.01',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z',
  zen: 'M12 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM8 22l1-4-2-3 3-4 2 1 2-1 3 4-2 3 1 4M4 12h3l3-2 4 2h3',
};

interface IconConfig {
  name: keyof typeof ICON_PATHS;
  color: string;
}

const ICONS: IconConfig[] = [
  { name: 'brain', color: '#f59e0b' },
  { name: 'heart', color: '#ef4444' },
  { name: 'zen',   color: '#34d399' },
];

const ICON_SIZE = 18;

// ── IconCluster ────────────────────────────────────────────────────────────────
// Three icons displayed in a tight horizontal row (no orbit)
// Used as a regular flex child, not absolutely positioned

export function OrbitingIcons({ frame: _ }: { frame?: number }) {
  const size = rs(ICON_SIZE);
  const gap = rs(20);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap }}>
      {ICONS.map((icon) => {
        const path = ICON_PATHS[icon.name];
        return (
          <View key={icon.name} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              style={{
                shadowColor: icon.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 5,
                elevation: 4,
              }}
            >
              <Path
                d={path}
                fill="none"
                stroke={icon.color}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </View>
        );
      })}
    </View>
  );
}
