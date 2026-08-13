import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check, ChevronRight, Shuffle, Vibrate, Volume2, VolumeX } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { ROUTES } from '@/constants';
import { MillsBackground } from '@/components/games/mills/MillsBackground';
import type { Player } from '@/engine/core/games/mills';
import { clearMillsMatch } from '@/services/millsPersistence';

type First = 'P1' | 'P2' | 'random';
type PieceTheme = 'classic' | 'slate';

/** Mirrors the piece fills MillsBoard renders per theme, for an accurate visual preview. Values stay 'classic'/'slate' — only the on-screen label reads Pulse/Stone. */
const PIECE_PREVIEW: Record<PieceTheme, { p1: string; p2: string; label: string; helper: string }> = {
  classic: { p1: T.p1, p2: T.p2, label: 'Pulse', helper: 'Neon premium theme' },
  slate: { p1: '#EDE7DA', p2: '#1C1C1E', label: 'Stone', helper: 'Classic black and ivory' },
};

export default function MillsSetupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [p1, setP1] = useState('Player 1');
  const [p2, setP2] = useState('Player 2');
  const [first, setFirst] = useState<First>('P1');
  const [sound, setSound] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [theme, setTheme] = useState<PieceTheme>('classic');

  const selectTap = () => { void Haptics.selectionAsync().catch(() => {}); };

  const start = () => {
    const startingPlayer: Player = first === 'random' ? (Math.random() < 0.5 ? 'P1' : 'P2') : first;
    void clearMillsMatch().then(() =>
      router.replace({
        pathname: ROUTES.appMillsMatch,
        params: {
          p1: p1.trim() || 'Player 1',
          p2: p2.trim() || 'Player 2',
          startingPlayer,
          sound: String(sound),
          haptics: String(haptics),
          theme,
        },
      } as never)
    );
  };

  return (
    <View style={styles.safe}>
      <MillsBackground />

      <View style={[styles.inner, { paddingTop: Math.max(insets.top, 8) }]}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          <View style={styles.top}>
            <Pressable accessibilityLabel="Back" onPress={() => router.back()} style={styles.icon}>
              <ArrowLeft color={T.text} size={20} />
            </Pressable>
            <View>
              <Text style={styles.title}>Match setup</Text>
              <Text style={styles.sub}>Local Two Player</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            <Text style={styles.label}>PLAYERS</Text>
            <View style={styles.card}>
              <PlayerRow label="Player 1" value={p1} onChangeText={setP1} color={T.p1} />
              <View style={styles.rule} />
              <PlayerRow label="Player 2" value={p2} onChangeText={setP2} color={T.p2} />
            </View>

            <Text style={styles.label}>PIECE STYLE</Text>
            <View style={styles.pieceRow}>
              {(['classic', 'slate'] as const).map(v => (
                <PieceStyleCard key={v} value={v} active={theme === v} onPress={() => { selectTap(); setTheme(v); }} />
              ))}
            </View>

            <Text style={styles.label}>FIRST PLAYER</Text>
            <View style={styles.chipRow}>
              <FirstPlayerChip label="Player 1" color={T.p1} active={first === 'P1'} onPress={() => { selectTap(); setFirst('P1'); }} />
              <FirstPlayerChip label="Player 2" color={T.p2} active={first === 'P2'} onPress={() => { selectTap(); setFirst('P2'); }} />
              <FirstPlayerChip label="Random" color={T.textMuted} icon={Shuffle} active={first === 'random'} onPress={() => { selectTap(); setFirst('random'); }} />
            </View>

            <Text style={styles.label}>MATCH OPTIONS</Text>
            <View style={styles.optionsCard}>
              <ToggleRow icon={sound ? Volume2 : VolumeX} label="Sound" value={sound} onValueChange={setSound} />
              <View style={styles.rule} />
              <ToggleRow icon={Vibrate} label="Haptics" value={haptics} onValueChange={setHaptics} />
            </View>

            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push(ROUTES.appMillsRules as never)}
              style={({ pressed }) => [styles.rulesLink, pressed && styles.rulesLinkPressed]}
            >
              <View style={styles.rulesLinkRow}>
                <Text style={styles.rulesLinkText}>View Rules</Text>
                <ChevronRight color={T.textMuted} size={15} style={styles.rulesLinkIcon} />
              </View>
            </Pressable>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
            <Pressable accessibilityRole="button" onPress={start} style={styles.start}>
              <Text style={styles.startText}>Start Match</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

function PlayerRow({ label, value, onChangeText, color }: { label: string; value: string; onChangeText(v: string): void; color: string }) {
  return (
    <View style={styles.playerRow}>
      <View style={[styles.playerDot, { backgroundColor: color }]} />
      <View style={styles.playerFieldWrap}>
        <Text style={[styles.playerLabel, { color }]}>{label}</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          maxLength={18}
          selectTextOnFocus
          placeholderTextColor={T.textMuted}
          style={styles.playerInput}
        />
      </View>
    </View>
  );
}

function PieceStyleCard({ value, active, onPress }: { value: PieceTheme; active: boolean; onPress(): void }) {
  const preview = PIECE_PREVIEW[value];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${preview.label} piece style`}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.pieceCard, active && styles.pieceCardActive]}
    >
      <View style={styles.piecePreviewRow}>
        <View style={[styles.piecePreviewDot, { backgroundColor: preview.p1 }]} />
        <View style={[styles.piecePreviewDot, { backgroundColor: preview.p2 }]} />
      </View>
      <View style={styles.pieceTextCol}>
        <Text style={[styles.pieceLabel, active && styles.pieceLabelActive]}>{preview.label}</Text>
        <Text style={styles.pieceHelper} numberOfLines={1}>{preview.helper}</Text>
      </View>
      {active && (
        <View style={styles.pieceCheck}>
          <Check color={T.background} size={9} strokeWidth={3} />
        </View>
      )}
    </Pressable>
  );
}

function FirstPlayerChip({ label, color, active, onPress, icon: Icon }: { label: string; color: string; active: boolean; onPress(): void; icon?: LucideIcon }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && { borderColor: color, backgroundColor: `${color}18` }]}
    >
      {Icon ? <Icon color={active ? color : T.textMuted} size={13} /> : <View style={[styles.chipDot, { backgroundColor: active ? color : T.textMuted }]} />}
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({ icon: Icon, label, value, onValueChange }: { icon: LucideIcon; label: string; value: boolean; onValueChange(v: boolean): void }) {
  return (
    <View style={styles.toggleRow}>
      <Icon color={value ? T.p1 : T.textMuted} size={16} />
      <Text style={styles.toggleText}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#293444', true: T.p1Dark }} thumbColor={value ? T.p1 : '#A0A9B4'} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.background },
  flex: { flex: 1 },
  inner: { flex: 1 },
  container: { paddingHorizontal: 22, paddingTop: 6, paddingBottom: 18, gap: 13 },

  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceSoft, borderWidth: 1, borderColor: T.border },
  title: { color: T.text, fontFamily: FONTS.heading, fontSize: 25 },
  sub: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 12, marginTop: 1 },

  label: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 10, letterSpacing: 1.8 },
  card: { backgroundColor: 'rgba(255,255,255,0.025)', borderColor: T.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 4 },
  rule: { height: 1, backgroundColor: T.border },

  /* Players */
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  playerDot: { width: 12, height: 12, borderRadius: 6 },
  playerFieldWrap: { flex: 1, gap: 4 },
  playerLabel: { fontFamily: FONTS.bodySemi, fontSize: 9.5, letterSpacing: 1.2, textTransform: 'uppercase' },
  playerInput: { height: 30, color: T.text, fontFamily: FONTS.bodySemi, fontSize: 16, padding: 0 },

  /* Piece style — compact pills, not oversized cards */
  pieceRow: { flexDirection: 'row', gap: 10 },
  pieceCard: { flex: 1, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.025)', borderWidth: 1, borderColor: T.border, paddingHorizontal: 10, paddingVertical: 8 },
  pieceCardActive: { borderColor: T.p1, backgroundColor: 'rgba(55,213,208,0.08)' },
  piecePreviewRow: { flexDirection: 'row' },
  piecePreviewDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)', marginLeft: -5 },
  pieceTextCol: { flex: 1, minWidth: 0, gap: 1 },
  pieceLabel: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 13 },
  pieceLabelActive: { color: T.text },
  pieceHelper: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 9, opacity: 0.8 },
  pieceCheck: { width: 15, height: 15, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: T.p1 },

  /* First player */
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: T.border, backgroundColor: 'rgba(255,255,255,0.025)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 12 },

  /* Match options — compact rows, one light card */
  optionsCard: { backgroundColor: 'rgba(255,255,255,0.025)', borderColor: T.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46 },
  toggleText: { flex: 1, color: T.text, fontFamily: FONTS.bodySemi, fontSize: 14 },

  /* Rules — lightweight link, not a card. Row layout lives on an inner View
     (not the Pressable itself) so alignment can't be lost to a style-merge quirk. */
  rulesLink: { alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingVertical: 10 },
  rulesLinkPressed: { opacity: 0.6 },
  rulesLinkRow: { flexDirection: 'row', alignItems: 'center' },
  rulesLinkText: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 12.5, includeFontPadding: false },
  rulesLinkIcon: { marginLeft: 5, marginTop: 1 },

  /* Sticky CTA footer — opaque scrim so scrolled content never visually collides with it */
  footer: { paddingHorizontal: 22, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(8,13,24,0.94)' },
  start: { height: 56, borderRadius: 18, backgroundColor: T.p1, alignItems: 'center', justifyContent: 'center', shadowColor: T.p1, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.32, shadowRadius: 16 },
  startText: { color: '#071316', fontFamily: FONTS.bodyBold, fontSize: 16, letterSpacing: 0.3 },
});
