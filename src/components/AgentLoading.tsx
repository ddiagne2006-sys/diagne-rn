import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import { faCircleCheck, faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, radius, space } from '@/theme/tokens';

import { AppText } from './AppText';

const STEP_INTERVAL_MS = 2500;

/** Icône de chargement qui tourne, immobile si « réduire les animations » est actif. */
function Spinner() {
  const [rotation] = useState(() => new Animated.Value(0));
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduced) => {
        if (cancelled || reduced) return;
        animation = Animated.loop(
          Animated.timing(rotation, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }),
        );
        animation.start();
      });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [rotation]);
  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <FontAwesomeIcon icon={faCircleNotch} size={32} color={colors.primary} />
    </Animated.View>
  );
}

/**
 * Attente d'un agent (jusqu'à 200 s). Les étapes avancent avec le temps pour rassurer : elles ne reflètent pas
 * un résultat, qui vient uniquement de la réponse de l'API.
 */
export function AgentLoading({ agent }: { agent: 'ideas' }) {
  const title = fr.agent.loading[agent];
  const steps = fr.agent.loading.steps[agent];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
    const timer = setInterval(() => setIndex((i) => Math.min(i + 1, steps.length - 1)), STEP_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [steps.length, title]);

  const progress = Math.round(((index + 1) / (steps.length + 1)) * 100);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={title}
      accessibilityValue={{ min: 0, max: 100, now: progress }}
      accessibilityLiveRegion="polite">
      <Spinner />
      <AppText style={styles.title}>{title}</AppText>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${progress}%` }]} />
      </View>
      <View style={styles.steps}>
        {steps.map((step, i) => {
          const done = i < index;
          const active = i === index;
          return (
            <View key={step} style={styles.step}>
              <FontAwesomeIcon
                icon={done ? faCircleCheck : active ? faCircleNotch : farCircle}
                size={16}
                color={done ? colors.success : active ? colors.primary : colors.muted}
              />
              <AppText style={done ? styles.done : active ? undefined : styles.pending}>{step}</AppText>
            </View>
          );
        })}
      </View>
      <AppText variant="small" style={styles.hint}>
        {fr.agent.loading.hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space.lg,
    padding: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  title: { fontFamily: font.bold, textAlign: 'center' },
  track: { alignSelf: 'stretch', height: 8, borderRadius: 4, backgroundColor: colors.sidebar, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, backgroundColor: colors.primary },
  steps: { alignSelf: 'stretch', gap: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  done: { color: colors.success },
  pending: { color: colors.muted },
  hint: { textAlign: 'center' },
});
