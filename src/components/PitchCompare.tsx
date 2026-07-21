import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { fonts, tokens } from '../theme';

// Pitch-contour overlay for Mandarin tone feedback, drawn on the LIGHT card
// face: native clip in brand violet, learner's take in XP gold. Labels (not
// color alone) carry the meaning.

const VB_W = 320;
const VB_H = 120;
const PAD = 6;
const RANGE_ST = 8; // semitones shown above/below the midline (clamped)

// Break a 64-point contour (NaN = unvoiced) into polyline point strings.
// Single-point runs are doubled so round linecaps render them as dots.
function toSegments(contour: number[]): string[] {
  const n = contour.length;
  if (n < 2) return [];
  const segs: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length === 1) segs.push(`${run[0]} ${run[0]}`);
    else if (run.length > 1) segs.push(run.join(' '));
    run = [];
  };
  for (let i = 0; i < n; i++) {
    const v = contour[i];
    if (Number.isFinite(v)) {
      const clamped = Math.max(-RANGE_ST, Math.min(RANGE_ST, v));
      const x = PAD + (i / (n - 1)) * (VB_W - PAD * 2);
      const y = VB_H / 2 - (clamped / RANGE_ST) * (VB_H / 2 - PAD);
      run.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    } else {
      flush();
    }
  }
  flush();
  return segs;
}

export default function PitchCompare({
  reference,
  user,
  score,
}: {
  reference: number[];
  user: number[] | null;
  score?: number | null;
}) {
  const refSegs = toSegments(reference);
  const userSegs = user ? toSegments(user) : [];

  const chip =
    score == null
      ? null
      : score >= 75
        ? { label: `🎯 Tones match: ${score}%`, bg: 'rgba(52,211,153,0.18)', fg: '#0B7A55' }
        : score >= 50
          ? { label: `${score}% — close`, bg: 'rgba(251,191,36,0.20)', fg: '#8F5E06' }
          : { label: `${score}% — listen again`, bg: 'rgba(251,113,133,0.16)', fg: '#B91C3C' };

  return (
    <View style={styles.wrap} accessibilityLabel="Pitch contour comparison">
      <Svg width="100%" height={VB_H} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        <Line
          x1={PAD}
          y1={VB_H / 2}
          x2={VB_W - PAD}
          y2={VB_H / 2}
          stroke="rgba(23,19,58,0.12)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
        {refSegs.map((pts, i) => (
          <Polyline
            key={`ref-${i}`}
            points={pts}
            fill="none"
            stroke={tokens.brand.primary}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {userSegs.map((pts, i) => (
          <Polyline
            key={`user-${i}`}
            points={pts}
            fill="none"
            stroke={tokens.game.xpGold}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
      <View style={styles.legendRow}>
        <View style={[styles.dot, { backgroundColor: tokens.brand.primary }]} />
        <Text style={[styles.legendText, { color: tokens.brand.primaryDown }]}>Native</Text>
        {user != null && (
          <>
            <View style={[styles.dot, { backgroundColor: tokens.game.xpGold }]} />
            {/* Darkened gold so the label stays legible on the light face. */}
            <Text style={[styles.legendText, { color: '#8F6A0A' }]}>You</Text>
          </>
        )}
        {chip && (
          <View style={[styles.scoreChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.scoreChipText, { color: chip.fg }]}>{chip.label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch', alignItems: 'center', gap: 4 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  scoreChip: {
    borderRadius: tokens.radius.pill,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginLeft: 4,
  },
  scoreChipText: { fontFamily: fonts.bodySemiBold, fontSize: 11 },
});
