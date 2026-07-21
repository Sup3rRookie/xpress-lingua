import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { fonts, tokens } from '../theme';

export type TabId = 'home' | 'practice' | 'profile';

const TABS: { id: TabId; emoji: string; label: string }[] = [
  { id: 'home', emoji: '⚡', label: 'Learn' },
  { id: 'practice', emoji: '🎯', label: 'Practice' },
  { id: 'profile', emoji: '👤', label: 'You' },
];

// Bottom tab bar (mobile) / left rail (desktop ≥768px).
export default function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (t: TabId) => void;
}) {
  const { width } = useWindowDimensions();
  const rail = width >= 768;

  return (
    <View style={rail ? styles.rail : styles.bar}>
      <View style={rail ? styles.railItems : styles.items}>
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <Pressable
              key={t.id}
              style={rail ? styles.railItem : styles.item}
              onPress={() => onChange(t.id)}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.iconPill, isActive && styles.iconPillActive]}>
                <Text style={styles.icon}>{t.emoji}</Text>
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: tokens.bg.raised,
    borderTopWidth: 1,
    borderTopColor: tokens.border.subtle,
    height: Platform.OS === 'web' ? 72 : 64,
    paddingBottom: Platform.OS === 'web' ? 8 : 0,
  },
  items: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rail: {
    width: 88,
    height: '100%',
    backgroundColor: tokens.bg.raised,
    borderRightWidth: 1,
    borderRightColor: tokens.border.subtle,
  },
  railItems: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 28,
    gap: 18,
  },
  railItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconPill: {
    width: 44,
    height: 28,
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPillActive: {
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderColor: '#8B5CF6',
  },
  icon: { fontSize: 22 },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: tokens.text.secondary,
  },
  labelActive: { color: tokens.text.primary },
});
