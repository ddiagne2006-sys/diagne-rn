import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { gradients, space } from '@/theme/tokens';

/** Fond dégradé et zones sûres, pour les écrans qui gèrent leur propre défilement (FlatList). */
export function ScreenBackground({ children, edges }: { children: ReactNode; edges?: Edge[] }) {
  return (
    <LinearGradient colors={gradients.page} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={edges}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Fond dégradé, zones sûres, contenu défilant et clavier qui ne masque pas les champs. */
export function Screen({ children, centered = false }: { children: ReactNode; centered?: boolean }) {
  return (
    <ScreenBackground>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, centered && styles.centered]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: space.lg, gap: space.lg },
  centered: { justifyContent: 'center' },
});
