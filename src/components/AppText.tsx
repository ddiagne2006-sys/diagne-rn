import { StyleSheet, Text, type TextProps } from 'react-native';

import { font } from '@/theme/fonts';
import { colors, fontSize } from '@/theme/tokens';

type Variant = 'body' | 'title' | 'label' | 'small';

export function AppText({ variant = 'body', style, ...props }: TextProps & { variant?: Variant }) {
  return <Text {...props} style={[styles.base, styles[variant], style]} />;
}

const styles = StyleSheet.create({
  base: { fontFamily: font.regular, color: colors.ink, fontSize: fontSize.body },
  body: {},
  title: { fontFamily: font.bold, fontSize: fontSize.title },
  label: { fontFamily: font.medium, color: colors.inkSoft },
  small: { fontSize: fontSize.small, color: colors.muted },
});
