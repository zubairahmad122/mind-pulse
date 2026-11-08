import { useRouter } from 'expo-router';
import {
  BarChart3,
  Brain,
  ChevronRight,
  Leaf,
  Moon,
  User,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ROUTES } from '@/constants';
import { colors } from '@/constants/colors';
import { FONTS, PALETTE, PILLAR_COLORS, RADIUS } from '@/constants/designSystem';
import { useActivityHistory } from '@/hooks/useActivity';
import { getMindGamesUnlock, loadFirstSeenDate } from '@/services/mindGamesUnlock';
import { todayISO } from '@/utils/dateUtils';

type Row = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  route: string;
  highlight?: boolean;
};

export default function MoreScreen() {
  const router = useRouter();
  const { events } = useActivityHistory();
  const [storedFirstSeen, setStoredFirstSeen] = useState<string | null>(null);

  useEffect(() => {
    void loadFirstSeenDate().then(setStoredFirstSeen);
  }, []);

  // Existing users have older activity than the date this screen first saved.
  const earliestActivity = events[0]?.date;
  const firstSeen =
    earliestActivity && storedFirstSeen && earliestActivity < storedFirstSeen
      ? earliestActivity
      : storedFirstSeen;
  const mindGames = firstSeen ? getMindGamesUnlock(firstSeen, todayISO()) : null;
  // Sleep is hidden, but people who already use it must keep a way to reach it.
  const usesSleep = events.some(e => e.type === 'SLEEP_SESSION_COMPLETED');

  const rows: Row[] = [
    {
      id: 'stats',
      title: 'Stats',
      subtitle: 'Screen time and weekly trends',
      icon: BarChart3,
      color: PALETTE.mint,
      route: ROUTES.appScreenBalance,
    },
    {
      id: 'relax',
      title: 'Breathing & Relax',
      subtitle: 'Calm breathing and guided audio',
      icon: Leaf,
      color: PILLAR_COLORS.relax,
      route: ROUTES.appRelax,
    },
    ...(mindGames?.unlocked
      ? [
          {
            id: 'mind',
            title: 'Mind Games',
            subtitle: mindGames.isNew ? 'New: train your focus' : 'Train your focus',
            icon: Brain,
            color: PILLAR_COLORS.mind,
            route: ROUTES.appMind,
            highlight: mindGames.isNew,
          },
        ]
      : []),
    ...(usesSleep
      ? [
          {
            id: 'sleep',
            title: 'Sleep',
            subtitle: 'Your sleep plan and alarms',
            icon: Moon,
            color: PILLAR_COLORS.sleep,
            route: ROUTES.appSleep,
          },
        ]
      : []),
    {
      id: 'profile',
      title: 'Profile & Settings',
      subtitle: 'Account, reminders, and Pro',
      icon: User,
      color: '#C9CEDA',
      route: ROUTES.appProfile,
    },
  ];

  return (
    <ScreenShell ambient={<AmbientBackground subtle />}>
      <ScreenHeader title="More" subtitle="Everything else in Well Mode" />
      <View style={styles.list}>
        {rows.map(row => (
          <TouchableOpacity
            key={row.id}
            style={styles.row}
            onPress={() => router.push(row.route as never)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`${row.title}, ${row.subtitle}`}
          >
            <View style={[styles.iconWrap, { backgroundColor: row.color + '22' }]}>
              <row.icon size={20} color={row.color} strokeWidth={2} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{row.title}</Text>
              <Text style={[styles.subtitle, row.highlight && styles.subtitleNew]}>
                {row.subtitle}
              </Text>
            </View>
            <ChevronRight size={18} color="rgba(245,247,251,0.35)" strokeWidth={2} />
          </TouchableOpacity>
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    marginTop: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: RADIUS.hero,
    backgroundColor: 'rgba(22, 18, 58, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(164,139,255,0.14)',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.bodySemi,
    fontSize: 16,
    color: colors.text.primary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: 'rgba(245,247,251,0.55)',
  },
  subtitleNew: {
    color: PALETTE.mint,
    fontWeight: '600',
  },
});
