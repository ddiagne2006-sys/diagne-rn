import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Duration, Network, AppConfig } from '@/api/types';
import { networkColor, networkIcon } from '@/domain/project';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './AppText';

type NetworkPickerProps = {
  networks: AppConfig['networks'];
  value: Network;
  onChange: (value: Network) => void;
  disabled?: boolean;
};

/** Groupe radio des réseaux ; le ratio affiché vient de l'API (RG2). */
export function NetworkPicker({ networks, value, onChange, disabled }: NetworkPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={fr.brief.network} style={styles.group}>
      <AppText variant="label">{fr.brief.network}</AppText>
      {networks.map((network) => {
        const selected = network.value === value;
        return (
          <Pressable
            key={network.value}
            accessibilityRole="radio"
            accessibilityLabel={fr.brief.networkOption(network.label, network.ratio)}
            accessibilityState={{ selected, checked: selected, disabled }}
            disabled={disabled}
            onPress={() => onChange(network.value)}
            style={[styles.option, selected && styles.optionSelected]}>
            <FontAwesomeIcon icon={networkIcon[network.value]} size={20} color={networkColor[network.value]} />
            <AppText style={styles.optionLabel}>{network.label}</AppText>
            <AppText variant="small">{network.ratio}</AppText>
            <FontAwesomeIcon icon={selected ? faCircleCheck : farCircle} size={20} color={colors.primary} />
          </Pressable>
        );
      })}
    </View>
  );
}

type DurationPickerProps = {
  durations: Duration[];
  value: Duration;
  onChange: (value: Duration) => void;
  disabled?: boolean;
};

export function DurationPicker({ durations, value, onChange, disabled }: DurationPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={fr.brief.duration} style={styles.group}>
      <AppText variant="label">{fr.brief.duration}</AppText>
      <View style={styles.row}>
        {durations.map((duration) => {
          const selected = duration === value;
          return (
            <Pressable
              key={duration}
              accessibilityRole="radio"
              accessibilityLabel={fr.brief.durationOption(duration)}
              accessibilityState={{ selected, checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(duration)}
              style={[styles.chip, selected && styles.chipSelected]}>
              <AppText style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                {fr.project.seconds(duration)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  option: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  optionLabel: { flex: 1, fontFamily: font.medium },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: touch.min,
    minWidth: 72,
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  chipLabel: { fontFamily: font.medium, fontSize: fontSize.body, color: colors.inkSoft },
  chipLabelSelected: { color: colors.onPrimary },
});
