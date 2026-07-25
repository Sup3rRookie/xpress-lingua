import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { DeckItem } from '../data/types';

// Flashcard visual: generated pixel-art image when one exists, emoji otherwise.
// Missing images 404 and fall back silently, so partial image sets just work.
export default function ItemVisual({
  item,
  size = 132,
  tint,
  lang = 'zh',
}: {
  item: DeckItem;
  size?: number;
  tint?: string;
  lang?: string;
}) {
  const [failed, setFailed] = useState(false);
  // Generated images exist only for Mandarin (img/zh). Imported Anki cards have
  // none. Anything else shows the emoji without firing a guaranteed 404.
  const hasImages = lang === 'zh' && !item.audioKey;

  if (failed || !hasImages) {
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
