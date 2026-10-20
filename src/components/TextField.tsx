import { useId, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { font } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './AppText';

type Props = TextInputProps & { label: string; error?: string; ref?: Ref<TextInput> };

export function TextField({ label, error, ref, ...props }: Props) {
  const labelId = useId();
  return (
    <View style={styles.field}>
      <AppText variant="label" nativeID={labelId}>
        {label}
      </AppText>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityLabelledBy={labelId}
        accessibilityHint={error}
        placeholderTextColor={colors.muted}
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? (
        <AppText variant="small" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  input: {
    minHeight: touch.min,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    textAlignVertical: 'top',
    fontFamily: font.regular,
    fontSize: fontSize.body,
    color: colors.ink,
  },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger },
});
