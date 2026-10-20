import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { StyleSheet, View } from 'react-native';

import { font } from '@/theme/fonts';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

/** Encadré d'avertissements (alertes d'un agent), lu d'un bloc par les lecteurs d'écran. */
export function Notice({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={styles.notice} accessible accessibilityLabel={[title, ...items].join('. ')}>
      <FontAwesomeIcon icon={faTriangleExclamation} size={16} color={colors.warning} />
      <View style={styles.body}>
        <AppText style={styles.title}>{title}</AppText>
        {items.map((item, index) => (
          <AppText key={index} variant="small" style={styles.item}>
            {`• ${item}`}
          </AppText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.card,
    backgroundColor: colors.warningBg,
  },
  body: { flex: 1, gap: space.xs },
  title: { fontFamily: font.medium },
  item: { color: colors.ink },
});
