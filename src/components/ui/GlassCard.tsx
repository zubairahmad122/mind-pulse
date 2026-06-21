import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function GlassCard({ children, style, className = '' }: GlassCardProps) {
  return (
    <View
      className={`bg-app-card border border-app-border rounded-2xl p-4 ${className}`.trim()}
      style={style}
    >
      {children}
    </View>
  );
}
