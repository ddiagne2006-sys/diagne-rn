import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useAppConfig, useCreateProject } from '@/api/projects';
import type { AppConfig, Duration, Network } from '@/api/types';
import { AppText } from '@/components/AppText';
import { DurationPicker, NetworkPicker } from '@/components/BriefPickers';
import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { Screen, ScreenBackground } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { ApiError } from '@/api/client';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, radius, space, touch } from '@/theme/tokens';

const t = fr.brief;

export function NewProjectScreen() {
  const config = useAppConfig();
  if (config.isPending) {
    return (
      <ScreenBackground edges={['left', 'right']}>
        <LoadingState label={t.configLoading} />
      </ScreenBackground>
    );
  }
  if (config.isError) {
    return (
      <ScreenBackground edges={['left', 'right']}>
        <ErrorState message={errorMessage(config.error)} onRetry={() => config.refetch()} />
      </ScreenBackground>
    );
  }
  return <BriefForm config={config.data} />;
}

/** Brief (RG1) : la validation locale n'est qu'un confort, l'API vérifie tout. */
function BriefForm({ config }: { config: AppConfig }) {
  const create = useCreateProject();
  const [theme, setTheme] = useState('');
  const [network, setNetwork] = useState<Network>(config.networks[0]?.value ?? 'tiktok');
  const [duration, setDuration] = useState<Duration>(config.durations.includes(30) ? 30 : (config.durations[0] ?? 30));
  const [themeError, setThemeError] = useState<string>();
  const [generalError, setGeneralError] = useState<string>();

  function validate(value: string) {
    if (value.length < config.theme_min_length) return t.themeTooShort(config.theme_min_length);
    if (value.length > config.theme_max_length) return t.themeTooLong(config.theme_max_length);
    return undefined;
  }

  async function submit() {
    if (create.isPending) return;
    const trimmed = theme.trim();
    const error = validate(trimmed);
    setThemeError(error);
    setGeneralError(undefined);
    if (error) return;
    try {
      const project = await create.mutateAsync({ theme: trimmed, network, duration_seconds: duration });
      // Le projet s'ouvre et lance l'agent Idées (attente, erreurs et nouvel essai y sont gérés)
      router.replace({ pathname: '/project/[id]', params: { id: project.id, generate: '1' } });
    } catch (failure) {
      const fieldError = failure instanceof ApiError ? failure.fieldError('theme') : undefined;
      if (fieldError) setThemeError(fieldError);
      else setGeneralError(errorMessage(failure));
    }
  }

  const busy = create.isPending;

  return (
    <Screen>
      <View style={styles.card}>
        <View style={styles.heading}>
          <AppText variant="title" accessibilityRole="header">
            {t.title}
          </AppText>
          <AppText style={styles.muted}>{t.subtitle}</AppText>
        </View>

        {generalError ? <FormAlert message={generalError} /> : null}

        <View style={styles.field}>
          <TextField
            label={t.theme}
            placeholder={t.themePlaceholder}
            value={theme}
            onChangeText={setTheme}
            error={themeError}
            maxLength={config.theme_max_length}
            multiline
            editable={!busy}
          />
          <AppText variant="small" style={styles.count}>
            {t.themeCount(theme.trim().length, config.theme_max_length)}
          </AppText>
        </View>

        {config.suggestions.length > 0 ? (
          <View style={styles.suggestions}>
            <AppText variant="small">{t.suggestions}</AppText>
            <View style={styles.chips}>
              {config.suggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  accessibilityRole="button"
                  accessibilityLabel={t.useSuggestion(suggestion)}
                  disabled={busy}
                  onPress={() => {
                    setTheme(suggestion);
                    setThemeError(undefined);
                  }}
                  style={styles.chip}>
                  <AppText style={styles.chipText}>{suggestion}</AppText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <NetworkPicker networks={config.networks} value={network} onChange={setNetwork} disabled={busy} />
        <DurationPicker durations={config.durations} value={duration} onChange={setDuration} disabled={busy} />

        <Button label={busy ? t.creating : t.submit} onPress={submit} loading={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.xl,
  },
  heading: { gap: space.xs },
  muted: { color: colors.muted },
  field: { gap: space.xs },
  count: { alignSelf: 'flex-end' },
  suggestions: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.field,
    backgroundColor: colors.primaryTint,
  },
  chipText: { fontFamily: font.medium, color: colors.primary, fontSize: 14 },
});
