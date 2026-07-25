import { ScreenShell } from "@/components/layout/ScreenShell";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { GlassCard } from "@/components/ui/GlassCard";
import { GradientCTA } from "@/components/ui/GradientCTA";
import { PremiumBadge } from "@/components/ui/PremiumBadge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { ScreenTransition } from "@/components/ui/ScreenTransition";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SessionCard } from "@/components/ui/SessionCard";
import { SubscriptionBadge } from "@/components/ui/SubscriptionBadge";
import { ROUTES } from "@/constants";
import { colors } from "@/constants/colors";
import {
  FONTS,
  PILLAR_COLORS,
  RADIUS,
  SHADOWS,
  SURFACE,
  TYPOGRAPHY,
} from "@/constants/designSystem";
import { LANGUAGES } from "@/constants/languages";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSleep } from "@/context/SleepContext";
import { useSubscription } from "@/context/SubscriptionContext";
import { useEveningReminderSetting } from "@/hooks/useEveningReminderSetting";
import { useEyeScore } from "@/hooks/useEyeScore";
import { useMindScore } from "@/hooks/useMindScore";
import { useSleepScore } from "@/hooks/useSleepScore";
import { useUnlockedAchievements } from "@/hooks/useUnlockedAchievements";
import { useProgressStore } from "@/stores/useProgressStore";
import { useWellnessStore } from "@/stores/useWellnessStore";
import { calculateMindPulseScore } from "@/utils/scoring";
import { addDaysISO, getMondayISO, todayISO } from "@/utils/dateUtils";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import {
  Activity,
  Bell,
  ChevronRight,
  Crown,
  Edit3,
  Flame,
  Globe,
  LogOut,
  Moon,
  Sparkles,
  Trophy,
} from "lucide-react-native";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Profile isn't a pillar screen — it uses the app's generic brand purple,
// same value as Home's own accent, not any single pillar's color.
const ACCENT = SURFACE.purple;
// A distinct, slightly deeper purple used only for the avatar border and the
// FREE badge — a deliberate accent variant for this one "premium" moment,
// not a replacement for ACCENT everywhere else.
const PREMIUM_PURPLE = "#7B4DFF";
const LOG_OUT_RED = "#FF5F72";
// A weekly-session target in the same spirit as Sleep's "7 nights/week" or
// Relax's fixed minute goal — one real session per day, not a fabricated stat.
const WEEKLY_ACTIVITY_GOAL = 7;

/** Chevrons stay neutral everywhere on this screen — only the icon badges
 * are accent-colored (purple/indigo/red). */
function NeutralChevron() {
  return (
    <View style={styles.neutralArrow}>
      <ChevronRight size={18} color="rgba(255,255,255,0.4)" strokeWidth={2.3} />
    </View>
  );
}

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/** Mon-Sun activity dots — reuses the same activityLog Challenges uses, so
 * "did I show up this week" tells one consistent story everywhere it's shown. */
function WeekDots({ activityLog }: { activityLog: string[] }) {
  const today = todayISO();
  const monday = getMondayISO();
  const activitySet = new Set(activityLog);

  return (
    <View style={styles.weekDotsRow}>
      {Array.from({ length: 7 }, (_, i) => {
        const date = addDaysISO(monday, i);
        const done = activitySet.has(date);
        const isToday = date === today;
        return (
          <View key={date} style={styles.weekDotCell}>
            <View
              style={[
                styles.weekDot,
                done && styles.weekDotDone,
                isToday && !done && styles.weekDotToday,
              ]}
            />
            <Text style={styles.weekDotLabel}>{WEEKDAY_LABELS[i]}</Text>
          </View>
        );
      })}
    </View>
  );
}

function StatCell({
  icon: Icon,
  color,
  value,
  label,
  context,
  progress,
}: {
  icon: typeof Flame;
  color: string;
  value: string;
  label: string;
  /** Short supporting line under the label (e.g. "All time", "Not started") —
   * turns an ambiguous number into a self-explanatory fact. Omit if it would
   * just be noise for that state. */
  context?: string;
  /** 0–100 — omit to render a plain number/label card with no bar. */
  progress?: number;
}) {
  return (
    <GlassCard style={styles.stat}>
      <View
        style={[
          styles.statIconBox,
          { backgroundColor: color + "1F", borderColor: color + "40" },
        ]}
      >
        <Icon size={19} color={color} strokeWidth={2} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {/* "First session" wrapped to 2 lines while "Day streak"/"Sessions" sat
          on one, making the row look uneven — shrink instead of wrap, same
          fix used for Relax's mood-cell labels. */}
      <Text
        style={styles.statLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      {context != null && (
        <Text style={styles.statContext} numberOfLines={1}>
          {context}
        </Text>
      )}
      {progress != null && (
        <ProgressBar
          progress={progress / 100}
          fill={color}
          style={styles.statProgress}
        />
      )}
    </GlassCard>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { isPremium } = useSubscription();
  const { sessions } = useSleep();
  const { langCode, setLang } = useLanguage();
  const router = useRouter();
  const {
    enabled: reminderEnabled,
    loading: reminderLoading,
    toggle: toggleReminder,
  } = useEveningReminderSetting(user?.uid);

  const eyeResult = useEyeScore(user?.uid ?? undefined);
  const mindResult = useMindScore(user?.uid ?? undefined);
  const sleepResult = useSleepScore(
    user?.uid ?? undefined,
    user?.isAnonymous ?? true,
  );
  const { unlockedCount, totalCount } = useUnlockedAchievements();
  const weeklySessions = useProgressStore((s) => s.weeklySessions);

  const isGuest = user?.isAnonymous ?? true;
  const displayName = isGuest
    ? "Guest"
    : (user?.displayName ?? user?.email?.split("@")[0] ?? "User");
  const streak = useWellnessStore((s) => s.streak);
  const longestStreak = useWellnessStore((s) => s.longestStreak);
  const activityLog = useWellnessStore((s) => s.activityLog);
  const anyLoading =
    eyeResult.loading || mindResult.loading || sleepResult.loading;
  const eyes = eyeResult.loading ? 0 : eyeResult.score;
  const sleepScore = sleepResult.loading ? 0 : sleepResult.score;
  const mind = mindResult.loading ? 0 : mindResult.score;
  const mindPulseScore = calculateMindPulseScore({
    eyeScore: eyes,
    sleepScore,
    mindScore: mind,
  });

  // Real streak progress toward your own best streak (not a fabricated goal).
  const streakProgress =
    longestStreak > 0
      ? Math.min(100, (streak / longestStreak) * 100)
      : streak > 0
        ? 100
        : 0;

  const totalWeeklySessions =
    weeklySessions.eye +
    weeklySessions.eyeGames +
    weeklySessions.relax +
    weeklySessions.mind +
    weeklySessions.sleep;

  const handleSignOut = () => {
    Alert.alert(
      isGuest ? "Exit Guest Mode" : "Sign Out",
      isGuest ? "Return to welcome?" : "Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isGuest ? "Exit" : "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace(ROUTES.welcome);
            } catch (error: unknown) {
              const message =
                error instanceof Error ? error.message : "Could not sign out.";
              Alert.alert("Error", message);
            }
          },
        },
      ],
    );
  };

  return (
    <ScreenShell safeBottom ambient={<AmbientBackground />}>
      <ScreenTransition>
        <ScreenHeader
          title="Profile"
          subtitle="Your account & preferences"
          rightAction={<SubscriptionBadge />}
        />

        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <LinearGradient
              colors={["#241938", "#1A1230"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Subtle inner highlight — the closest RN gets to an inset shadow */}
            <LinearGradient
              colors={["rgba(255,255,255,0.05)", "transparent"]}
              style={styles.avatarSheen}
              pointerEvents="none"
            />
            <Text style={styles.avatarLetter}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            {isPremium && <PremiumBadge />}
          </View>
          <Text style={styles.email}>
            {isGuest ? "Guest mode" : (user?.email ?? "")}
          </Text>
        </View>

        {isPremium ? (
          <GlassCard noPadding style={styles.membershipCard}>
            <View style={styles.membershipInner}>
              <View style={styles.membershipIconWrap}>
                <Crown size={20} color={PILLAR_COLORS.challenge} />
              </View>
              <View style={styles.membershipText}>
                <Text style={styles.membershipTitle}>MindPulse Pro</Text>
                <Text style={styles.membershipSub}>
                  You have full access to every feature
                </Text>
              </View>
            </View>
          </GlassCard>
        ) : (
          <TouchableOpacity
            onPress={() => router.push(ROUTES.appPremium as never)}
            activeOpacity={0.85}
          >
            <GlassCard
              noPadding
              style={{
                ...styles.membershipCard,
                borderColor: ACCENT + "40",
                ...styles.membershipGlow,
              }}
              tint={[ACCENT + "26", ACCENT + "0D"]}
            >
              <View style={styles.membershipInner}>
                <View style={styles.membershipIconWrap}>
                  <Crown size={20} color={ACCENT} />
                </View>
                <View style={styles.membershipText}>
                  <View style={styles.membershipTitleRow}>
                    <Text style={styles.membershipTitle} numberOfLines={1}>
                      Upgrade to Pro
                    </Text>
                    <PremiumBadge />
                  </View>

                  <Text
                    style={styles.membershipSub}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    Unlock every feature
                  </Text>
                </View>
                {/* Same arrow badge as every Account row — a bare chevron here
                  read as a smaller, different arrow than the rest of the app. */}
                <NeutralChevron />
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}

        <SectionLabel>OVERVIEW</SectionLabel>
        <View style={styles.statsRow}>
          <StatCell
            icon={Flame}
            color="#FF9800"
            value={String(streak)}
            label="Day streak"
            context={streak > 0 ? "Keep going" : undefined}
            progress={streak > 0 ? streakProgress : undefined}
          />
          <StatCell
            icon={Moon}
            color={PILLAR_COLORS.sleep}
            value={String(sessions.length)}
            label="Sessions"
            context="All time"
          />
          <StatCell
            icon={Sparkles}
            color="#22d3ee"
            value={
              anyLoading
                ? "–"
                : sessions.length > 0
                  ? String(mindPulseScore)
                  : "—"
            }
            label={sessions.length === 0 ? "First session" : "Score"}
            context={!anyLoading && sessions.length === 0 ? "Not started" : undefined}
            progress={
              !anyLoading && sessions.length > 0 ? mindPulseScore : undefined
            }
          />
        </View>

        {/* Preferences — one settings-row system shared by both cards (icon
          badge + title + subtitle), so Voice Language and Daily Reminder read
          as the same component family instead of two unrelated card shapes.
          Voice Language keeps its inline segmented switcher (not a nav-away
          picker) — its subtitle names the current selection so the state is
          obvious even before looking at the segments below. */}
        <SectionLabel>PREFERENCES</SectionLabel>
        <GlassCard style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            <View
              style={[
                styles.settingsIconWrap,
                { backgroundColor: ACCENT + "26", borderColor: ACCENT + "40" },
              ]}
            >
              <Globe size={18} color={ACCENT} strokeWidth={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Voice Language</Text>
              <Text style={styles.settingsSub}>
                {LANGUAGES.find((l) => l.code === langCode)?.labelEn ?? "English"}
              </Text>
            </View>
          </View>
          <View style={styles.langSegmentWrap}>
            {LANGUAGES.map((l) => (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLang(l.code)}
                style={[
                  styles.langSegment,
                  langCode === l.code && styles.langSegmentActive,
                ]}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: langCode === l.code }}
              >
                <Text
                  style={[
                    styles.langSegmentText,
                    langCode === l.code && styles.langSegmentTextActive,
                  ]}
                >
                  {l.labelEn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <GlassCard style={styles.settingsCard}>
          <View style={styles.settingsRow}>
            {/* Bug fix: concatenating '26' onto an already-complete rgba() string
              produced an invalid color when disabled, which rendered brighter
              than every other icon container instead of a subtle neutral tint. */}
            <View
              style={[
                styles.settingsIconWrap,
                {
                  backgroundColor: reminderEnabled
                    ? ACCENT + "26"
                    : "rgba(255,255,255,0.08)",
                  borderColor: reminderEnabled
                    ? ACCENT + "40"
                    : "rgba(255,255,255,0.12)",
                },
              ]}
            >
              <Bell
                size={18}
                color={reminderEnabled ? ACCENT : colors.text.tertiary}
                strokeWidth={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingsTitle}>Daily Reminder</Text>
              <Text style={styles.settingsSub}>
                {reminderEnabled ? "Evening nudge is on" : "Evening nudge is off"}
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={toggleReminder}
              disabled={reminderLoading}
              trackColor={{ false: "#252542", true: ACCENT }}
              thumbColor={reminderEnabled ? "#FFFFFF" : colors.text.secondary}
            />
          </View>
        </GlassCard>

        {/* Weekly Activity — its own layout, not the shared WeeklyProgressRow:
          "Weekly Activity" + "N Sessions" combined ran wider than the row on
          real phone widths, so the two sat flush with no gap between them.
          Splitting the metric onto its own line fixes that for good instead
          of hoping the label/value combo never gets that long again. */}
        <View style={{ marginTop: spacing.md }}>
          <SectionLabel>WEEKLY ACTIVITY</SectionLabel>
          <GlassCard style={{ borderRadius: RADIUS.card, ...SHADOWS.medium }}>
            <View style={styles.weeklyTopRow}>
              <View style={styles.weeklyLabelGroup}>
                <Activity size={13} color={ACCENT} strokeWidth={1.5} />
                <Text style={styles.weeklyLabel}>Weekly Activity</Text>
              </View>
              {totalWeeklySessions > 0 && (
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.appReport as never)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.weeklyLink}>View Insights →</Text>
                </TouchableOpacity>
              )}
            </View>

            {totalWeeklySessions > 0 ? (
              // Active state: the metric + goal bar plus a day-by-day dot
              // strip — "12 Sessions" alone doesn't say which days you
              // actually showed up, the dots do.
              <>
                <Text style={styles.weeklyMetric}>
                  {totalWeeklySessions} Session
                  {totalWeeklySessions === 1 ? "" : "s"}
                </Text>
                <ProgressBar
                  progress={Math.min(1, totalWeeklySessions / WEEKLY_ACTIVITY_GOAL)}
                  fill={ACCENT}
                  style={styles.weeklyTrack}
                />
                <WeekDots activityLog={activityLog} />
              </>
            ) : (
              // Empty state is a nudge, not a dead end — same "0 Sessions"
              // fact, paired with a reason to act and a real way to act on it.
              <>
                <Text style={styles.weeklyMetric}>0 Sessions</Text>
                <Text style={styles.weeklyEmptyText}>
                  Start your first session to begin building your wellness
                  journey.
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(ROUTES.appHome as never)}
                  activeOpacity={0.85}
                  style={styles.weeklyStartBtn}
                >
                  <Text style={styles.weeklyStartBtnText}>
                    Start a Session →
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </GlassCard>
        </View>

        <SectionLabel>ACCOUNT</SectionLabel>
        <SessionCard
          icon={Edit3}
          title="Edit Profile"
          meta={["Name, age & personal details"]}
          accent={ACCENT}
          trailing={<NeutralChevron />}
          onPress={() => router.push(ROUTES.appEditProfile as never)}
        />
        <View style={{ height: spacing.sm }} />
        <SessionCard
          icon={Trophy}
          title="Achievements"
          meta={[`${unlockedCount} of ${totalCount} unlocked`]}
          accent={PILLAR_COLORS.challenge}
          trailing={<NeutralChevron />}
          onPress={() => router.push(ROUTES.appAchievements as never)}
        />

        {isGuest && (
          <View style={styles.createWrap}>
            <GradientCTA
              label="CREATE ACCOUNT"
              onPress={() => router.push(ROUTES.authCreateAccount)}
              colors={[ACCENT, "#7c3aed", "#c026d3"]}
              glowColor="rgba(124,58,237,0.5)"
              letterSpacing={1.2}
            />
          </View>
        )}

        <View
          style={{ height: spacing.sm, marginTop: isGuest ? 0 : spacing.sm }}
        />
        <SessionCard
          icon={LogOut}
          title={isGuest ? "Exit Guest Mode" : "Log Out"}
          titleColor={LOG_OUT_RED}
          meta={[
            isGuest ? "Return to welcome screen" : "Sign out of your account",
          ]}
          accent={LOG_OUT_RED}
          trailing={<NeutralChevron />}
          onPress={handleSignOut}
        />

        <View style={{ height: 32 }} />
      </ScreenTransition>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  neutralArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  avatarWrap: { alignItems: "center", marginBottom: spacing.md, marginTop: 4 },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: PREMIUM_PURPLE,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: PREMIUM_PURPLE,
    shadowOffset: { width: 0, height: 4 },
    // ~30% softer than before — felt isolated/too strong next to everything else.
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  avatarSheen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "55%",
  },
  avatarLetter: { fontSize: 32, fontWeight: "700", color: PREMIUM_PURPLE },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 14,
  },
  name: { fontSize: 22, fontWeight: "700", color: colors.text.primary },
  email: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.68)",
    marginTop: 5,
  },
  membershipCard: {
    marginBottom: spacing.lg,
    borderRadius: RADIUS.card,
  },
  membershipInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 18,
    // A bit more horizontal breathing room than the default GlassCard inset —
    // this card's own inner wrapper (noPadding + this View) so it doesn't
    // touch the shared GlassCard default used everywhere else.
    paddingHorizontal: 22,
  },
  membershipGlow: {
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    // Softened further — with the FREE header badge + PRO badge + crown all
    // already signaling "this is the upgrade path," a strong glow on top was
    // one premium cue too many. Just enough to lift the card off the page.
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  membershipIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: ACCENT + "26",
    borderWidth: 1,
    borderColor: ACCENT + "4D",
    alignItems: "center",
    justifyContent: "center",
  },
  membershipText: { flex: 1, gap: 2 },
  membershipTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  membershipTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text.primary,
  },
  membershipSub: { fontSize: 13, color: "rgba(255,255,255,0.65)" },
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },

  // Fixed height + centered content (not top-anchored) so all three cards
  // match regardless of whether that particular one has a context line or
  // progress bar — a card with less content just sits centered in the same
  // box instead of looking shorter.
  stat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: RADIUS.card - 10,
    minHeight: 128,
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 26,
    textAlign: "center",
    color: "#FFFFFF",
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  // alignSelf:'stretch' — the card uses alignItems:'center', which lets a
  // Text child size to its own intrinsic width instead of the card's actual
  // width, leaving numberOfLines/adjustsFontSizeToFit nothing real to shrink
  // against (the same RN gotcha fixed on Relax's mood-cell labels earlier).
  statLabel: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.6)",
    alignSelf: "stretch",
  },
  statContext: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.4)",
    alignSelf: "stretch",
  },
  statProgress: { width: "100%", marginTop: 6 },
  // Shared settings-row system — same icon badge/title/subtitle treatment for
  // every Preferences card, so Voice Language and Daily Reminder read as one
  // component family instead of two unrelated card shapes.
  settingsCard: {
    marginBottom: spacing.md,
    gap: spacing.md,
    borderRadius: RADIUS.card,
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  settingsIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsTitle: {
    ...typography.label,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  settingsSub: { fontSize: 12.5, color: colors.text.secondary, marginTop: 2 },
  // Same segmented-control shape as Sleep's Tonight/Routine/Analysis switcher —
  // one bordered track, solid-fill active segment, not floating separate pills.
  langSegmentWrap: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  langSegment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 16,
  },
  langSegmentActive: {
    backgroundColor: ACCENT,
  },
  langSegmentText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
  },
  langSegmentTextActive: { color: "#FFFFFF", fontWeight: "700" },
  createWrap: { marginTop: spacing.md },
  // ── Weekly Activity ──
  weeklyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  weeklyLabelGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  weeklyLabel: {
    fontSize: TYPOGRAPHY.meta.fontSize,
    fontWeight: "600",
    color: "rgba(245,247,251,0.6)",
  },
  weeklyLink: {
    fontSize: TYPOGRAPHY.caption.fontSize,
    fontWeight: "600",
    color: "rgba(245,247,251,0.4)",
  },
  weeklyMetric: {
    fontFamily: FONTS.heading,
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 10,
  },
  weeklyTrack: { marginTop: 10 },
  weeklyEmptyText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(245,247,251,0.6)",
    lineHeight: 18,
    marginTop: 6,
  },
  weeklyStartBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  weeklyStartBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
    color: ACCENT,
  },
  weekDotsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  weekDotCell: { alignItems: "center", gap: 5 },
  weekDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  weekDotDone: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  weekDotToday: {
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  weekDotLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(245,247,251,0.45)",
  },
});
