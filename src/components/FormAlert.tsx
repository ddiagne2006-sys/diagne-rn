import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

/** Erreur générale d'un formulaire, annoncée aux lecteurs d'écran. */
export function FormAlert({ message }: { message: string }) {
  return (
    <View style={styles.alert} accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
      <FontAwesomeIcon icon={faTriangleExclamation} size={16} color={colors.danger} />
      <AppText style={styles.text}>{message}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.field,
    backgroundColor: colors.dangerBg,
  },
  text: { flex: 1, color: colors.danger },
});
