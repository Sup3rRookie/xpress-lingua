import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { tokens } from '../theme';
import { useReducedMotion } from '../lib/motion';

const COLORS = [
  tokens.brand.primary,
  tokens.brand.cyan,
  tokens.game.xpGold,
  tokens.semantic.danger, // rose
];

interface Piece {
  left: number; // % across the container
  size: number;
  color: string;
  delay: number;
  drift: number; // horizontal drift in px
  spin: number; // total rotation in deg
  round: boolean;
  anim: Animated.Value;
}

// Custom confetti burst — ~40 small Views falling with x-drift + rotation.
// Fired once on mount; skipped entirely under reduce-motion.
export default function Confetti({ count = 40, height = 560 }: { count?: number; height?: number }) {
  const reduced = useReducedMotion();
  const fired = useRef(false);

  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        size: 6 + Math.random() * 6,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 260,
        drift: (Math.random() - 0.5) * 140,
        spin: (Math.random() - 0.5) * 1080,
        round: Math.random() < 0.35,
        anim: new Animated.Value(0),
      })),
    [count],
  );

  useEffect(() => {
    if (reduced || fired.current) return;
    fired.current = true;
    pieces.forEach((p) => {
      Animated.timing(p.anim, {
        toValue: 1,
        duration: 1400,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [pieces, reduced]);

  if (reduced) return null;

  return (
    <View pointerEvents="none" style={[styles.layer, { height }]}>
      {pieces.map((p, i) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-30, height + 30],
        });
        const translateX = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, p.drift],
        });
        const rotate = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${p.spin}deg`],
        });
        const opacity = p.anim.interpolate({
          inputRange: [0, 0.75, 1],
          outputRange: [1, 1, 0],
        });
        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              top: 0,
              left: `${p.left}%`,
              width: p.size,
              height: p.round ? p.size : p.size * 1.7,
              borderRadius: p.round ? p.size / 2 : 2,
              backgroundColor: p.color,
              opacity,
              transform: [{ translateY }, { translateX }, { rotate }],
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
});
