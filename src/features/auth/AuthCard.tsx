import { faBolt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, gradients, radius, space } from '@/theme/tokens';

/** Carte blanche des écrans de connexion et d'inscription, avec le logo. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.brand} accessible accessibilityLabel={fr.app.name}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logo}>
          <FontAwesomeIcon icon={faBolt} size={20} color={colors.onPrimary} />
        </LinearGradient>
        <AppText style={styles.brandName}>{fr.app.name}</AppText>
      </View>
      <View style={styles.card}>
        <View style={styles.heading}>
          <AppText variant="title" accessibilityRole="header">
            {title}
          </AppText>
          <AppText style={styles.subtitle}>{subtitle}</AppText>
        </View>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: space.xl, width: '100%', maxWidth: 440, alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  logo: { width: 40, height: 40, borderRadius: radius.field, alignItems: 'center', justifyContent: 'center' },
  brandName: { fontFamily: font.bold, fontSize: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.xl,
    gap: space.lg,
  },
  heading: { gap: space.xs },
  subtitle: { color: colors.muted },
});
