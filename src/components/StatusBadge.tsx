import { StyleSheet, View } from 'react-native';

import type { ProjectStatus } from '@/api/types';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, fontSize, space } from '@/theme/tokens';

import { AppText } from './AppText';

const tone: Record<ProjectStatus, { background: string; text: string }> = {
  draft: { background: colors.line, text: colors.inkSoft },
  ideas_ready: { background: colors.infoBg, text: colors.primaryHover },
  idea_chosen: { background: colors.infoBg, text: colors.primaryHover },
  script_ready: { background: colors.warningBg, text: colors.warning },
  scenes_ready: { background: colors.successBg, text: colors.success },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: tone[status].background }]}>
      <AppText style={[styles.label, { color: tone[status].text }]}>{fr.status[status]}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: space.sm, paddingVertical: 2 },
  label: { fontFamily: font.medium, fontSize: fontSize.small },
});
