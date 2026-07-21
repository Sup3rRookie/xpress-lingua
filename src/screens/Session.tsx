import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Deck, DeckItem } from '../data/types';
import { speak } from '../lib/audio';
import { playUrl, recordingSupported, startRecording, stopRecording } from '../lib/recorder';
import { buildQueue, review, Rating, type Grade } from '../lib/srs';
import { colors } from '../theme';
import TonePinyin from '../components/TonePinyin';

type Phase = 'front' | 'back';

const GRADES: { label: string; hint: string; rating: Grade; color: string }[] = [
  { label: 'Blank', hint: 'again soon', rating: Rating.Again, color: colors.danger },
  { label: 'Shaky', hint: 'hard', rating: Rating.Hard, color: colors.warn },
  { label: 'Nailed it', hint: 'good', rating: Rating.Good, color: colors.success },
  { label: 'Too easy', hint: 'easy', rating: Rating.Easy, color: colors.primary },
];

export default function Session({ deck, onDone }: { deck: Deck; onDone: () => void }) {
  const [queue, setQueue] = useState<DeckItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('front');
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [recording, setRecording] = useState(false);
  const [myTakeUrl, setMyTakeUrl] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    buildQueue(deck).then((q) => {
      setNewIds(new Set(q.fresh.map((i) => i.id)));
      setQueue([...q.due, ...q.fresh]);
    });
  }, [deck]);

  const item = useMemo(() => (queue && index < queue.length ? queue[index] : null), [queue, index]);
  const isNew = item ? newIds.has(item.id) : false;

  if (!queue) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading session…</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.center}>
        <Text style={styles.doneEmoji}>🎉</Text>
        <Text style={styles.doneTitle}>Session complete</Text>
        <Text style={styles.muted}>
          {reviewed} card{reviewed === 1 ? '' : 's'} spoken out loud. See you tomorrow!
        </Text>
        <Pressable style={styles.primaryBtn} onPress={onDone}>
          <Text style={styles.primaryBtnText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  const flip = () => {
    setPhase('back');
    speak(item.hanzi, deck.ttsLocale);
  };

  const grade = async (rating: Grade) => {
    await review(item.id, rating);
    setReviewed((n) => n + 1);
    setMyTakeUrl(null);
    setPhase('front');
    setIndex((i) => i + 1);
  };

  const toggleRecord = async () => {
    if (recording) {
      const url = await stopRecording();
      setRecording(false);
      setMyTakeUrl(url);
      if (url) playUrl(url);
    } else {
      const ok = await startRecording();
      setRecording(ok);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable onPress={onDone}>
          <Text style={styles.muted}>✕ End</Text>
        </Pressable>
        <Text style={styles.muted}>
          {index + 1} / {queue.length}
        </Text>
      </View>

      {isNew && phase === 'front' && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>✨ NEW — listen first, then copy it</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.emoji}>{item.emoji}</Text>
        <Text style={styles.gloss}>{item.gloss}</Text>

        {phase === 'front' ? (
          <>
            <Text style={styles.speakPrompt}>🗣️ Say it in Mandarin — out loud!</Text>
            {isNew && (
              <Pressable style={styles.ghostBtn} onPress={() => speak(item.hanzi, deck.ttsLocale)}>
                <Text style={styles.ghostBtnText}>🔊 Hear it first (new card)</Text>
              </Pressable>
            )}
            <Pressable style={styles.primaryBtn} onPress={flip}>
              <Text style={styles.primaryBtnText}>I said it — flip</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TonePinyin pinyin={item.pinyin} />
            <Text style={styles.hanzi}>{item.hanzi}</Text>

            <View style={styles.row}>
              <Pressable style={styles.ghostBtn} onPress={() => speak(item.hanzi, deck.ttsLocale)}>
                <Text style={styles.ghostBtnText}>🔊 Native</Text>
              </Pressable>
              <Pressable style={styles.ghostBtn} onPress={() => speak(item.hanzi, deck.ttsLocale, true)}>
                <Text style={styles.ghostBtnText}>🐢 Slow</Text>
              </Pressable>
            </View>

            {recordingSupported() && (
              <View style={styles.row}>
                <Pressable
                  style={[styles.ghostBtn, recording && styles.recBtnActive]}
                  onPress={toggleRecord}
                >
                  <Text style={styles.ghostBtnText}>
                    {recording ? '⏹ Stop' : '🎙️ Record my take'}
                  </Text>
                </Pressable>
                {myTakeUrl && (
                  <Pressable style={styles.ghostBtn} onPress={() => playUrl(myTakeUrl)}>
                    <Text style={styles.ghostBtnText}>▶️ My take</Text>
                  </Pressable>
                )}
              </View>
            )}

            <Text style={styles.gradeHint}>How did your spoken answer go?</Text>
            <View style={styles.gradeRow}>
              {GRADES.map((g) => (
                <Pressable
                  key={g.label}
                  style={[styles.gradeBtn, { backgroundColor: g.color }]}
                  onPress={() => grade(g.rating)}
                >
                  <Text style={styles.gradeBtnText}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, alignItems: 'center' },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  topBar: {
    width: '100%',
    maxWidth: 480,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 14,
  },
  emoji: { fontSize: 72 },
  gloss: { fontSize: 24, fontWeight: '600', color: colors.surfaceText, textAlign: 'center' },
  speakPrompt: { fontSize: 16, color: '#64748B', textAlign: 'center' },
  hanzi: { fontSize: 22, color: '#94A3B8' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 16,
    marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  ghostBtn: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  ghostBtnText: { fontSize: 15, fontWeight: '600', color: colors.surfaceText },
  recBtnActive: { borderColor: colors.danger, backgroundColor: '#FEE2E2' },
  gradeHint: { fontSize: 13, color: '#94A3B8', marginTop: 8 },
  gradeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  gradeBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14 },
  gradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  newBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  newBadgeText: { color: '#78350F', fontWeight: '700', fontSize: 13 },
  muted: { color: colors.textMuted, fontSize: 15 },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: colors.textLight },
});
