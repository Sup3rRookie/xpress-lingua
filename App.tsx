import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Home from './src/screens/Home';
import Session from './src/screens/Session';
import { zhSurvival } from './src/data/zh-survival';
import { colors } from './src/theme';

export default function App() {
  const [screen, setScreen] = useState<'home' | 'session'>('home');

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="light" />
      {screen === 'home' ? (
        <Home deck={zhSurvival} onStart={() => setScreen('session')} />
      ) : (
        <Session deck={zhSurvival} onDone={() => setScreen('home')} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
