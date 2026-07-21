import React, { useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts, springs, tokens } from '../theme';
import { useReducedMotion } from '../lib/motion';

const EDGE = 4;

export interface ChunkyButtonProps {
  label: string;
  icon?: string;
  onPress: () => void;
  /** Solid face color. Ignored when `gradient` is given. */
  face?: string;
  /** Darker shade shown as the 4px bottom edge. */
  edge?: string;
  gradient?: readonly [string, string];
  textColor?: string;
  disabled?: boolean;
  small?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityHint?: string;
}

// Duolingo-style chunky pressed-edge button, pure StyleSheet + core Animated.
export default function ChunkyButton({
  label,
  icon,
  onPress,
  face = tokens.brand.primary,
  edge = tokens.brand.primaryDown,
  gradient,
  textColor = '#FFFFFF',
  disabled = false,
  small = false,
  style,
  textStyle,
  accessibilityHint,
}: ChunkyButtonProps) {
  const reduced = useReducedMotion();
  const press = useRef(new Animated.Value(0)).current;

  const animateTo = (v: number) => {
    if (reduced) {
      press.setValue(v);
      return;
    }
    Animated.spring(press, {
      toValue: v,
      ...springs.snappy,
      useNativeDriver: false,
    }).start();
  };

  const translateY = press.interpolate({ inputRange: [0, 1], outputRange: [0, EDGE] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });

  const faceInner = (
    <View style={[styles.faceInner, small && styles.faceInnerSmall]}>
      {icon ? (
        <Text style={[styles.icon, small && styles.iconSmall, { color: textColor }]}>{icon}</Text>
      ) : null}
      <Text
        style={[styles.label, small && styles.labelSmall, { color: textColor }, textStyle]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[disabled && styles.disabled, style]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={[styles.edge, { backgroundColor: edge }]}>
          <Animated.View style={[styles.face, { transform: [{ translateY }] }]}>
            {gradient ? (
              <LinearGradient
                colors={gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientFill}
              >
                {faceInner}
              </LinearGradient>
            ) : (
              <View style={[styles.gradientFill, { backgroundColor: face }]}>{faceInner}</View>
            )}
          </Animated.View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  edge: {
    borderRadius: tokens.radius.button,
  },
  face: {
    borderRadius: tokens.radius.button,
    marginBottom: EDGE,
    overflow: 'hidden',
  },
  gradientFill: {
    borderRadius: tokens.radius.button,
  },
  faceInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  faceInnerSmall: {
    gap: 4,
    paddingVertical: 11,
    paddingHorizontal: 6,
  },
  icon: { fontSize: 18, fontFamily: fonts.bodyBold },
  iconSmall: { fontSize: 13 },
  label: { fontSize: 18, fontFamily: fonts.bodyBold },
  labelSmall: { fontSize: 13 },
});
