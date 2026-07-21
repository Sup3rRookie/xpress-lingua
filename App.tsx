import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  InstrumentSans_400Regular,
  InstrumentSans_500Medium,
  InstrumentSans_600SemiBold,
  InstrumentSans_700Bold,
} from '@expo-google-fonts/instrument-sans';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { NotoSansSC_500Medium } from '@expo-google-fonts/noto-sans-sc';
import Home from './src/screens/Home';
import Session from './src/screens/Session';
import ImportMap from './src/screens/ImportMap';
import Sentences from './src/screens/Sentences';
import { zhSurvival } from './src/data/zh-survival';
import { Deck } from './src/data/types';
import { ImportResult, PickedApkg } from './src/lib/apkgImport';
import { tokens } from './src/theme';

type Screen = 'home' | 'import-map' | 'session' | 'sentences';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [activeDeck, setActiveDeck] = useState<Deck>(zhSurvival);
  const [pendingImport, setPendingImport] = useState<PickedApkg | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    InstrumentSans_400Regular,
    InstrumentSans_500Medium,
    InstrumentSans_600SemiBold,
    InstrumentSans_700Bold,
    SpaceGrotesk_700Bold,
    NotoSansSC_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <StatusBar style="light" />
        <Text style={styles.splashBolt}>⚡</Text>
        <Text style={styles.splashWordmark}>XpressLingua</Text>
      </View>
    );
  }

  const onImportDone = (result: ImportResult) => {
    setPendingImport(null);
    const cap = result.capped ? ` (imported first ${result.importedCount} of ${result.totalNotes})` : '';
    setBanner(
      `Imported ${result.importedCount} cards · ${result.audioStored} audio files${cap}`,
    );
    setScreen('home');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' && (
        <Home
          deck={zhSurvival}
          banner={banner}
          onStart={() => {
            setActiveDeck(zhSurvival);
            setScreen('session');
          }}
          onStudyImported={(imported) => {
            setActiveDeck(imported.deck);
            setScreen('session');
          }}
          onParsed={(picked) => {
            setPendingImport(picked);
            setBanner(null);
            setScreen('import-map');
          }}
          onSentences={() => setScreen('sentences')}
        />
      )}
      {screen === 'sentences' && <Sentences onDone={() => setScreen('home')} />}
      {screen === 'import-map' && pendingImport && (
        <ImportMap
          picked={pendingImport}
          onCancel={() => {
            setPendingImport(null);
            setScreen('home');
          }}
          onDone={onImportDone}
        />
      )}
      {screen === 'session' && (
        <Session deck={activeDeck} onDone={() => setScreen('home')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg.base },
  splash: {
    flex: 1,
    backgroundColor: tokens.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  splashBolt: { fontSize: 56 },
  splashWordmark: {
    color: tokens.text.primary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
