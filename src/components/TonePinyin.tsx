import React from 'react';
import { Text, TextStyle } from 'react-native';
import { syllables, toneOf, TONE_COLORS, TONE_COLORS_DARK } from '../lib/pinyin';
import { fonts } from '../theme';

export default function TonePinyin({
  pinyin,
  size = 26,
  dark = false,
}: {
  pinyin: string;
  size?: number;
  dark?: boolean; // brightened palette for dark backgrounds
}) {
  const palette = dark ? TONE_COLORS_DARK : TONE_COLORS;
  const style: TextStyle = { fontSize: size, fontFamily: fonts.bodySemiBold, textAlign: 'center' };
  return (
    <Text style={style} accessibilityLabel={pinyin}>
      {syllables(pinyin).map((syl, i) => (
        <Text key={i} style={{ color: palette[toneOf(syl)] }}>
          {syl}
          {' '}
        </Text>
      ))}
    </Text>
  );
}
