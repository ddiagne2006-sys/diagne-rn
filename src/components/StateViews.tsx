import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { colors, space } from '@/theme/tokens';

import { AppText } from './AppText';
import { Button } from './Button';

export function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.state} accessible accessibilityLabel={label} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.primary} size="large" />
      <AppText style={styles.muted}>{label}</AppText>
    </View>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.state}>
      <AppText style={[styles.muted, styles.center]}>{message}</AppText>
    </View>
  );
}

/** Erreur en français (detail du serveur ou texte de fr.ts) avec « Réessayer ». */
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.state}>
      <View style={styles.row} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
        <FontAwesomeIcon icon={faTriangleExclamation} size={18} color={colors.danger} />
        <AppText style={[styles.error, styles.center]}>{message}</AppText>
      </View>
      <Button variant="secondary" label={fr.common.retry} onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  state: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  muted: { color: colors.muted },
  center: { textAlign: 'center', flexShrink: 1 },
  error: { color: colors.danger },
});
