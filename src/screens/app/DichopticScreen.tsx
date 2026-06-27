import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AmbientBackground } from '@/components/ui';
import { ScreenShell } from '@/components/layout/ScreenShell';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { GlassCard } from '@/components/ui/GlassCard';
import { DichopticReaction } from '@/components/eye/games/DichopticReaction';
import {
  type DichopticColors,
  DEFAULT_DICHOPTIC_COLORS,
  loadDichopticColors,
  saveDichopticColors,
  blendIntoBackground,
} from '@/utils/dichoptic';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/context/SubscriptionContext';
import { useGameRecord } from '@/hooks/useGameRecord';
import { markGamePlayedToday } from '@/services/dailyEyeGoalsPersistence';
import type { GameEndStats } from '@/components/eye/games/GameOverScreen';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { PaywallGate } from '@/components/paywall/PaywallGate';

// ─── Color presets ────────────────────────────────────────────────────────────
const LEFT_PRESETS = ['#FF3366', '#FF0044', '#FF5555', '#CC0044', '#FF2266'];
const RIGHT_PRESETS = ['#00D4FF', '#00AACC', '#44DDFF', '#00BBFF', '#00EEFF'];

// ─── Simplified Color Picker ──────────────────────────────────────────────────
function ColorSelect({
  label, color, onChange, presets,
}: {
  label: string;
  color: string;
  onChange: (c: string) => void;
  presets: string[];
}) {
  return (
    <View style={cs.card}>
      <Text style={cs.label}>{label}</Text>
      <View style={cs.swatchRow}>
        {presets.map(p => (
          <TouchableOpacity
            key={p}
            onPress={() => onChange(p)}
            style={[
              cs.swatch,
              { backgroundColor: p },
              color === p && cs.swatchActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Calibration Preview ──────────────────────────────────────────────────────
function CalibPreview({ leftColor, rightColor }: { leftColor: string; rightColor: string }) {
  return (
    <View style={cs.previewRow}>
      <View style={cs.previewItem}>
        <View style={[cs.previewSquare, { borderColor: leftColor }]}>
          <View style={[cs.previewInner, { backgroundColor: blendIntoBackground(leftColor, 0.4) }]} />
        </View>
        <Text style={[cs.previewLabel, { color: leftColor }]}>👁 LEFT</Text>
      </View>
      <View style={cs.previewItem}>
        <View style={[cs.previewSquare, { borderColor: rightColor }]}>
          <View style={[cs.previewInner, { backgroundColor: blendIntoBackground(rightColor, 0.4) }]} />
        </View>
        <Text style={[cs.previewLabel, { color: rightColor }]}>👁 RIGHT</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DichopticScreen() {
  const { user } = useAuth();
  const { record, submit } = useGameRecord(user?.uid, 'dichoptic-reaction');
  const { isPremium: hasAccess } = useSubscription();

  const [dColors, setDColors] = useState<DichopticColors>(DEFAULT_DICHOPTIC_COLORS);
  const [loaded, setLoaded] = useState(false);
  const [screen, setScreen] = useState<'calibration' | 'game'>('calibration');
  const [gameStats, setGameStats] = useState<GameEndStats | null>(null);
  const [running, setRunning] = useState(false);
  const [showCalHelp, setShowCalHelp] = useState(false);

  useEffect(() => {
    loadDichopticColors().then(c => {
      setDColors(c);
      setLoaded(true);
    });
  }, []);

  const handleSave = () => {
    void saveDichopticColors(dColors);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleGameEnd = (stats: GameEndStats) => {
    setGameStats(stats);
    setRunning(false);
    void markGamePlayedToday(user?.uid ?? undefined);
    const quality = Number((stats.stats.find(s => s.label === 'Score')?.value ?? '0'));
    submit(quality);
  };

  if (!loaded) {
    return (
      <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="3D Game" showBack />
        <View style={cs.loading} />
      </ScreenShell>
    );
  }

  if (!hasAccess) {
    return (
      <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader title="3D Reaction" subtitle="Pick your colors" showBack />
        <PaywallGate featureId="eye_dichoptic">{null}</PaywallGate>
      </ScreenShell>
    );
  }

  // ─── Game screen ────────────────────────────────────────────────────────────
  if (screen === 'game' || gameStats) {
    return (
      <ScreenShell scroll={false} safeBottom ambient={<AmbientBackground subtle />}>
        <ScreenHeader
          title="3D Reaction"
          subtitle={gameStats ? 'Done' : 'Tap the right color'}
          showBack
        />

        {gameStats && (
          <View style={cs.resultBanner}>
            <Text style={cs.resultHeadline}>{gameStats.headline}</Text>
            <Text style={cs.resultSub}>{gameStats.subline}</Text>
          </View>
        )}

        <DichopticReaction
          running={running}
          colors={dColors}
          onGameEnd={handleGameEnd}
          onReplay={() => setGameStats(null)}
        />

        <TouchableOpacity
          style={cs.backBtn}
          onPress={() => { setScreen('calibration'); setGameStats(null); }}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={14} color={colors.text.secondary} />
          <Text style={cs.backBtnText}>Adjust Colors</Text>
        </TouchableOpacity>
      </ScreenShell>
    );
  }

  // ─── Calibration screen ─────────────────────────────────────────────────────
  return (
    <ScreenShell safeBottom ambient={<AmbientBackground subtle />}>
      <ScreenHeader
        title="3D Reaction"
        subtitle="Pick your colors"
        showBack
      />

      {/* Quick help toggle */}
      <TouchableOpacity
        style={cs.helpToggle}
        onPress={() => setShowCalHelp(!showCalHelp)}
        activeOpacity={0.7}
      >
        <Ionicons name={showCalHelp ? 'eye' : 'eye-outline'} size={16} color={colors.accent.purple} />
        <Text style={cs.helpToggleText}>
          {showCalHelp ? 'Hide tips' : 'How to calibrate?'}
        </Text>
      </TouchableOpacity>

      {showCalHelp && (
        <GlassCard style={{ marginBottom: spacing.sm }}>
          <Text style={cs.helpText}>
            1. Put on your anaglyph 3D glasses{'\n'}
            2. Close your <Text style={{ color: '#FF3366', fontWeight: '800' }}>RIGHT</Text> eye — pick RED so the square blends into the dark{'\n'}
            3. Close your <Text style={{ color: '#00D4FF', fontWeight: '800' }}>LEFT</Text> eye — pick CYAN so the square blends in{'\n'}
            4. Both eyes open — each sees only its own color
          </Text>
        </GlassCard>
      )}

      {/* Calibration squares */}
      <CalibPreview leftColor={dColors.left} rightColor={dColors.right} />

      <GlassCard style={{ marginBottom: spacing.sm }}>
        <ColorSelect
          label="👁️ Left Eye → picks RED"
          color={dColors.left}
          onChange={c => setDColors(prev => ({ ...prev, left: c, leftLabel: 'RED' }))}
          presets={LEFT_PRESETS}
        />
      </GlassCard>

      <GlassCard style={{ marginBottom: spacing.sm }}>
        <ColorSelect
          label="👁️ Right Eye → picks CYAN"
          color={dColors.right}
          onChange={c => setDColors(prev => ({ ...prev, right: c, rightLabel: 'CYAN' }))}
          presets={RIGHT_PRESETS}
        />
      </GlassCard>

      {/* Save + Play */}
      <TouchableOpacity style={cs.saveBtn} onPress={handleSave} activeOpacity={0.85}>
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
        <Text style={cs.saveBtnText}>Save Colors</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={cs.playBtn}
        onPress={() => { setScreen('game'); setRunning(true); }}
        activeOpacity={0.85}
      >
        <Text style={cs.playBtnText}>▶  PLAY GAME</Text>
      </TouchableOpacity>

      {record && (
        <Text style={cs.pbText}>
          🏆 Best: {record.value} pts
        </Text>
      )}
    </ScreenShell>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const cs = StyleSheet.create({
  loading: { flex: 1 },

  /* Help */
  helpToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginBottom: spacing.sm,
  },
  helpToggleText: { fontSize: 12, fontWeight: '700', color: colors.accent.purple },
  helpCard: {
    backgroundColor: colors.background.card,
    borderRadius: 12,
    borderWidth: 0.5, borderColor: colors.accent.purpleBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  helpText: {
    ...typography.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },

  /* Calibration Preview */
  previewRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  previewItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  previewSquare: {
    width: 100, height: 100,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#0a0818',
    alignItems: 'center', justifyContent: 'center',
  },
  previewInner: { width: 50, height: 50, borderRadius: 10 },
  previewLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 1 },

  card: {
    gap: spacing.sm,
    marginBottom: 0,
  },
  label: { ...typography.label, color: colors.text.secondary },
  swatchRow: { flexDirection: 'row', gap: spacing.sm },
  swatch: {
    width: 40, height: 40,
    borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  swatchActive: {
    borderWidth: 2.5,
    borderColor: '#ffffff',
  },

  /* Buttons */
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: 'rgba(123,97,255,0.15)',
    borderWidth: 1, borderColor: colors.accent.purpleBorder,
    borderRadius: 100,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.accent.purple },

  playBtn: {
    backgroundColor: colors.accent.purple,
    borderRadius: 100,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  playBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  pbText: {
    fontSize: 12, color: '#FFD700', fontWeight: '600',
    textAlign: 'center', marginBottom: spacing.lg,
  },

  /* Game Results */
  resultBanner: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  resultHeadline: { fontSize: 28, fontWeight: '900', color: '#fff' },
  resultSub: { fontSize: 12, color: colors.text.secondary, textAlign: 'center' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  backBtnText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },

});
