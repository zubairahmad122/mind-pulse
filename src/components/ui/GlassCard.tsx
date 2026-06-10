import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { glassCard } from '@/constants/glassCard';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function GlassCard({ children, style }: GlassCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { ...glassCard },
});
