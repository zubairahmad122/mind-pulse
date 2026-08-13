import { StyleSheet, Text, View } from 'react-native';
import { FONTS } from '@/constants/designSystem';
import { MILLS_THEME as T } from '@/constants/millsTheme';
import { countPieces, type GameState, type Player } from '@/engine/core/games/mills';

/** Player 1 = ring, Player 2 = diamond — identity never depends on color alone. */
export function IdentityMark({ player, color }: { player: Player; color: string }) {
  return player === 'P1'
    ? <View style={[styles.markCircle, { borderColor: color }]} />
    : <View style={[styles.markDiamond, { borderColor: color }]} />;
}

function PlayerHalf({ player, state, align }: { player: Player; state: GameState; align: 'left' | 'right' }) {
  const active = state.currentPlayer === player && !state.result;
  const p = state.players[player];
  const color = player === 'P1' ? T.p1 : T.p2;
  const name = state.settings.playerNames[player];
  const boardCount = countPieces(state.board, player);
  const placing = state.phase === 'placement';
  const primaryValue = placing ? p.piecesToPlace : boardCount;
  const primaryLabel = placing ? 'TO PLACE' : 'ON BOARD';
  // Placement's primary number already covers progress ("6 TO PLACE") — repeating the board
  // count alongside it was noise. Captured is the one number worth a second line either phase.
  const secondaryText = `Captured ${p.piecesCaptured}`;
  // Decorative only — a handful of tokens hint at "reserve" without trying to be an accurate
  // 1:1 count. The number above is the authoritative, readable figure.
  const reserveTokens = placing ? Math.min(p.piecesToPlace, 3) : 0;
  const end = align === 'right';

  return (
    <View
      accessibilityLabel={`${name}, ${active ? 'active turn' : 'waiting'}, ${boardCount} pieces on board, ${p.piecesToPlace} pieces left to place, ${p.piecesCaptured} captured`}
      style={[
        styles.half,
        end ? styles.halfRight : styles.halfLeft,
        active && { backgroundColor: `${color}12` },
      ]}
    >
      {active && <View style={[styles.activeLine, { backgroundColor: color }]} />}

      <View style={[styles.nameRow, end && styles.rowReverse]}>
        <IdentityMark player={player} color={active ? color : T.textMuted} />
        <Text numberOfLines={1} style={[styles.name, !active && styles.nameInactive, end && styles.textRight]}>
          {name}
        </Text>
      </View>

      {active && (
        <View style={[styles.turnBadge, end ? styles.turnBadgeStart : styles.turnBadgeEnd, { backgroundColor: `${color}20`, borderColor: `${color}45` }]}>
          <Text style={[styles.turnBadgeText, { color }]}>YOUR TURN</Text>
        </View>
      )}

      <View style={[styles.primaryRow, end && styles.alignEnd]}>
        <Text style={[styles.primaryValue, { color: active ? T.text : T.textMuted }]}>{primaryValue}</Text>
        <Text style={styles.primaryLabel}>{primaryLabel}</Text>
        {reserveTokens > 0 && (
          <View style={styles.reserveTokens}>
            {Array.from({ length: reserveTokens }, (_, i) => (
              <View key={i} style={[styles.reserveToken, { borderColor: `${color}55` }, player === 'P2' && styles.reserveDiamond]} />
            ))}
          </View>
        )}
      </View>
      <Text style={[styles.secondary, end && styles.textRight]} numberOfLines={1}>{secondaryText}</Text>
    </View>
  );
}

export function MillsPlayerStatus({ state }: { state: GameState }) {
  return (
    <View style={styles.bar}>
      <PlayerHalf player="P1" state={state} align="left" />
      <View style={styles.divider} />
      <PlayerHalf player="P2" state={state} align="right" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 66, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', backgroundColor: 'rgba(15,24,37,.72)', flexDirection: 'row', overflow: 'hidden' },
  divider: { width: 1, backgroundColor: T.border, marginVertical: 10 },
  half: { flex: 1, paddingHorizontal: 12, paddingVertical: 8, overflow: 'hidden' },
  halfLeft: { alignItems: 'flex-start' },
  halfRight: { alignItems: 'flex-end' },
  activeLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' },
  rowReverse: { flexDirection: 'row-reverse' },
  markCircle: { width: 7, height: 7, borderRadius: 3.5, borderWidth: 1.4 },
  markDiamond: { width: 7, height: 7, borderWidth: 1.4, borderRadius: 1.5, transform: [{ rotate: '45deg' }] },
  name: { color: T.text, fontFamily: FONTS.bodySemi, fontSize: 10.5, maxWidth: 82 },
  nameInactive: { color: T.textMuted },
  textRight: { textAlign: 'right' },
  alignEnd: { alignItems: 'flex-end' },

  /* Positioned in the inner corner (toward the divider) so it never collides with the outer-aligned name/stats text. */
  turnBadge: { position: 'absolute', top: 7, height: 12, borderRadius: 6, borderWidth: 1, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  turnBadgeEnd: { right: 8 },
  turnBadgeStart: { left: 8 },
  turnBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 6.5, letterSpacing: 0.5 },

  primaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 4 },
  primaryValue: { fontFamily: FONTS.heading, fontSize: 22, lineHeight: 23 },
  primaryLabel: { color: T.textMuted, fontFamily: FONTS.bodySemi, fontSize: 8.5, letterSpacing: 0.8 },
  reserveTokens: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 2 },
  reserveToken: { width: 5, height: 5, borderRadius: 2.5, borderWidth: 1.1, opacity: 0.7 },
  reserveDiamond: { borderRadius: 1, transform: [{ rotate: '45deg' }] },

  secondary: { color: T.textMuted, fontFamily: FONTS.body, fontSize: 9, marginTop: 3 },
});
