import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import Practice from './src/screens/Practice';
import Profile from './src/screens/Profile';
import Session from './src/screens/Session';
import ImportMap from './src/screens/ImportMap';
import Sentences from './src/screens/Sentences';
import ToneTrainer from './src/screens/ToneTrainer';
import TabBar, { TabId } from './src/components/TabBar';
import { zhSurvival } from './src/data/zh-survival';
import { Deck } from './src/data/types';
import { ImportResult, PickedApkg } from './src/lib/apkgImport';
import { tokens } from './src/theme';

type Screen = 'home' | 'practice' | 'profile' | 'import-map' | 'session' | 'sentences' | 'tone-trainer';
type ToneMode = 'quiz' | 'pairs' | 'shadow';
type SentencesTab = 'learned' | 'mix';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lastTab, setLastTab] = useState<TabId>('home');
  const [activeDeck, setActiveDeck] = useState<Deck>(zhSurvival);
  const [pendingImport, setPendingImport] = useState<PickedApkg | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [toneMode, setToneMode] = useState<ToneMode | undefined>(undefined);
  const [sentencesTab, setSentencesTab] = useState<SentencesTab | undefined>(undefined);
  const { width } = useWindowDimensions();
  const desktop = width >= 768;
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

  const selectTab = (t: TabId) => {
    setLastTab(t);
    setScreen(t);
  };

  const onImportDone = (result: ImportResult) => {
    setPendingImport(null);
    const cap = result.capped ? ` (imported first ${result.importedCount} of ${result.totalNotes})` : '';
    setBanner(
      `Imported ${result.importedCount} cards · ${result.audioStored} audio files${cap}`,
    );
    selectTab('practice');
  };

  const isTab = screen === 'home' || screen === 'practice' || screen === 'profile';

  const tabScreen = (
    <>
      {screen === 'home' && (
        <Home
          deck={zhSurvival}
          onStart={() => {
            setActiveDeck(zhSurvival);
            setScreen('session');
          }}
          onStudyDeck={(d) => {
            setActiveDeck(d);
            setScreen('session');
          }}
          onSentences={() => {
            setSentencesTab(undefined);
            setScreen('sentences');
          }}
          onToneTrainer={() => {
            setToneMode(undefined);
            setScreen('tone-trainer');
          }}
        />
      )}
      {screen === 'practice' && (
        <Practice
          banner={banner}
          onParsed={(picked) => {
            setPendingImport(picked);
            setBanner(null);
            setScreen('import-map');
          }}
          onStudyImported={(imported) => {
            setActiveDeck(imported.deck);
            setScreen('session');
          }}
          onStudyDeck={(d) => {
            setActiveDeck(d);
            setScreen('session');
          }}
          onToneTrainer={(mode) => {
            setToneMode(mode);
            setScreen('tone-trainer');
          }}
          onSentences={(tab) => {
            setSentencesTab(tab);
            setScreen('sentences');
          }}
        />
      )}
      {screen === 'profile' && <Profile />}
    </>
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {isTab ? (
        <View style={[styles.tabLayout, desktop && styles.tabLayoutDesktop]}>
          {desktop && <TabBar active={screen as TabId} onChange={selectTab} />}
          <View style={styles.tabScreen}>{tabScreen}</View>
          {!desktop && <TabBar active={screen as TabId} onChange={selectTab} />}
        </View>
      ) : (
        <>
          {screen === 'sentences' && (
            <Sentences initialTab={sentencesTab} onDone={() => selectTab('practice')} />
          )}
          {screen === 'tone-trainer' && (
            <ToneTrainer initialMode={toneMode} onDone={() => selectTab('practice')} />
          )}
          {screen === 'import-map' && pendingImport && (
            <ImportMap
              picked={pendingImport}
              onCancel={() => {
                setPendingImport(null);
                selectTab('practice');
              }}
              onDone={onImportDone}
            />
          )}
          {screen === 'session' && (
            <Session deck={activeDeck} onDone={() => setScreen(lastTab)} />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: tokens.bg.base },
  tabLayout: { flex: 1, flexDirection: 'column' },
  tabLayoutDesktop: { flexDirection: 'row' },
  tabScreen: { flex: 1 },
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
