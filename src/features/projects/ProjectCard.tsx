import { faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { Pressable, StyleSheet, View } from 'react-native';

import type { ProjectListItem } from '@/api/types';
import { AppText } from '@/components/AppText';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate, networkColor, networkIcon } from '@/domain/project';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, radius, space, touch } from '@/theme/tokens';

export function ProjectCard({ project, onPress }: { project: ProjectListItem; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fr.projects.open(project.title)}
      accessibilityHint={`${fr.status[project.status]}, ${fr.networks[project.network]}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <FontAwesomeIcon icon={networkIcon[project.network]} size={22} color={networkColor[project.network]} />
      </View>
      <View style={styles.body}>
        <AppText style={styles.title} numberOfLines={2}>
          {project.title}
        </AppText>
        <AppText variant="small">
          {`${fr.networks[project.network]} · ${fr.project.seconds(project.duration_seconds)} · ${project.ratio}`}
        </AppText>
        <View style={styles.footer}>
          <StatusBadge status={project.status} />
          <AppText variant="small" style={styles.date}>
            {fr.projects.updated(formatDate(project.updated_at))}
          </AppText>
        </View>
      </View>
      <FontAwesomeIcon icon={faChevronRight} size={14} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  pressed: { backgroundColor: colors.primaryTint },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.field,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: space.xs },
  title: { fontFamily: font.medium },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  date: { flexShrink: 1 },
});
