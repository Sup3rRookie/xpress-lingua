import React from 'react';
import { Text, TextStyle } from 'react-native';
import { syllables, toneOf, TONE_COLORS } from '../lib/pinyin';

export default function TonePinyin({ pinyin, size = 32 }: { pinyin: string; size?: number }) {
  const style: TextStyle = { fontSize: size, fontWeight: '700' };
  return (
    <Text style={style} accessibilityLabel={pinyin}>
      {syllables(pinyin).map((syl, i) => (
        <Text key={i} style={{ color: TONE_COLORS[toneOf(syl)] }}>
          {syl}
          {' '}
        </Text>
      ))}
    </Text>
  );
}
