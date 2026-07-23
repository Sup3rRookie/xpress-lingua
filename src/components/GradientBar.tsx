import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { springs, tokens } from '../theme';
import { useReducedMotion } from '../lib/motion';

// Animated gradient progress bar, springs (gentle) to `pct` on load / change.
export default function GradientBar({
  pct,
  height = 8,
  colors = tokens.brand.gradient,
}: {
  pct: number; // 0..100
  height?: number;
  colors?: readonly [string, string];
}) {
  const reduced = useReducedMotion();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const target = Math.max(0, Math.min(100, pct));
    if (reduced) {
      anim.setValue(target);
      return;
    }
    Animated.spring(anim, {
      toValue: target,
      ...springs.gentle,
      useNativeDriver: false,
    }).start();
  }, [pct, reduced, anim]);

  const width = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.fill, { width, borderRadius: height / 2 }]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: tokens.game.ringTrack,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    overflow: 'hidden',
  },
});
