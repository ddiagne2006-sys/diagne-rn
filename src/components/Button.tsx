import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { font } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'link';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && variant === 'primary' && styles.primaryPressed,
        inactive && styles.inactive,
      ]}>
      {loading && <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />}
      <AppText style={[styles.label, variant === 'primary' ? styles.primaryLabel : styles.secondaryLabel]}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch.min,
    borderRadius: radius.field,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryHover },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  link: { backgroundColor: 'transparent' },
  inactive: { opacity: 0.6 },
  label: { fontFamily: font.medium, fontSize: fontSize.body, textAlign: 'center' },
  primaryLabel: { color: colors.onPrimary },
  secondaryLabel: { color: colors.primary },
});
