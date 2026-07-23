import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Big soft violet glow field, absolutely positioned behind headers / cards.
export default function GlowEllipse({
  width = 520,
  height = 360,
  color = 'rgba(139,92,246,0.35)',
  style,
}: {
  width?: number;
  height?: number;
  color?: string;
  style?: ViewStyle;
}) {
  return (
    <LinearGradient
      colors={[color, 'rgba(139,92,246,0)']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      pointerEvents="none"
      style={[
        styles.base,
        { width, height, borderRadius: Math.min(width, height) / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    overflow: 'hidden',
  },
});
