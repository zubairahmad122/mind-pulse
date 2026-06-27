// ──────────────────────────────────────────────────────────────────────────────
// MPBottomNav — 5-tab bottom navigation bar
// ──────────────────────────────────────────────────────────────────────────────

import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MPIcon } from '@/components/atoms/MPIcon';
import { MPText } from '@/components/atoms/MPText';
import { COLORS, SIZES } from '@/theme';

type TabId = 'home' | 'sleep' | 'relax' | 'eye' | 'profile';

interface Tab {
  id: TabId;
  label: string;
  iconName: string;
  /** Override icon color when active (e.g., cyan for eye tab) */
  activeColor?: string;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', iconName: 'Home' },
  { id: 'sleep', label: 'Sleep', iconName: 'Moon' },
  { id: 'relax', label: 'Relax', iconName: 'Wind' },
  { id: 'eye', label: 'Eye', iconName: 'Eye', activeColor: COLORS.cyan },
  { id: 'profile', label: 'Profile', iconName: 'User' },
];

interface Props {
  activeTab: TabId;
  onTabPress: (tabId: TabId) => void;
}

export const MPBottomNav = React.memo(function MPBottomNav({ activeTab, onTabPress }: Props) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View
      style={{
        backgroundColor: COLORS.card,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderSubtle,
        paddingTop: 8,
        paddingBottom: bottomPad,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
      }}
      accessibilityRole="tabbar"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        const iconColor = isActive ? (tab.activeColor ?? COLORS.textPrimary) : COLORS.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.6}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: SIZES.touchTarget,
              minHeight: SIZES.touchTarget,
              gap: 4,
            }}
          >
            {isActive && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: `${iconColor}15`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MPIcon name={tab.iconName} size="sm" iconColor={iconColor} />
              </View>
            )}
            {!isActive && (
              <MPIcon name={tab.iconName} size="sm" color="muted" />
            )}
            <MPText
              variant="caption-xs"
              color={isActive ? 'primary' : 'muted'}
              style={{ marginTop: isActive ? 4 : 0 }}
            >
              {tab.label}
            </MPText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});
