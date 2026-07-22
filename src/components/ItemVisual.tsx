import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { DeckItem } from '../data/types';

// Flashcard visual: generated pixel-art image when one exists, emoji otherwise.
// Missing images 404 and fall back silently, so partial image sets just work.
export default function ItemVisual({
  item,
  size = 132,
  tint,
}: {
  item: DeckItem;
  size?: number;
  tint?: string;
}) {
  const [failed, setFailed] = useState(false);
  const isBuiltin = !item.audioKey; // imported Anki cards have no generated images

  if (failed || !isBuiltin) {
    return (
      <View
        style={[
          styles.emojiWrap,
          { width: size * 0.55, height: size * 0.55, borderRadius: size * 0.275 },
          tint ? { backgroundColor: tint } : null,
        ]}
      >
        <Text style={{ fontSize: size * 0.28 }}>{item.emoji ?? '🃏'}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri: `img/zh/${item.id}.webp` }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: 16 }}
      accessibilityLabel={item.gloss}
    />
  );
}

const styles = StyleSheet.create({
  emojiWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139,92,246,0.10)',
  },
});
