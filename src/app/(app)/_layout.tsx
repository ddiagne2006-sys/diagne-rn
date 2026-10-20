import { Stack } from 'expo-router';

import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors } from '@/theme/tokens';

const header = {
  headerShown: true,
  headerBackTitle: fr.projects.title,
  headerTintColor: colors.primary,
  headerTitleStyle: { fontFamily: font.medium, color: colors.ink },
  headerStyle: { backgroundColor: colors.surface },
} as const;

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" options={{ ...header, title: fr.brief.screenTitle }} />
      <Stack.Screen name="project/[id]" options={{ ...header, title: fr.project.title }} />
    </Stack>
  );
}
