import { faCircle as farCircle } from '@fortawesome/free-regular-svg-icons';
import { faChevronDown, faChevronUp, faCircleCheck, faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useState, type ReactNode } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import type { Idea, IdeaSource } from '@/api/types';
import { humanLabel, isHttpUrl, score10 } from '@/domain/project';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, fontSize, radius, space, touch } from '@/theme/tokens';

import { AppText } from './AppText';

const t = fr.ideas;

type Props = { idea: Idea; selected: boolean; disabled?: boolean; onSelect: () => void };

function hasDetails(idea: Idea) {
  return Boolean(
    idea.platform_fit ||
      idea.key_facts.length ||
      idea.sources.length ||
      idea.risks.length ||
      Object.keys(idea.details).length,
  );
}

/** Carte idée : sélection unique, détails dépliables. Textes de l'IA en texte brut (jamais de HTML). */
export function IdeaCard({ idea, selected, disabled = false, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const score = idea.viral_score === null ? null : score10(idea.viral_score);

  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={t.select(idea.title)}
        accessibilityHint={score ? t.score(score) : undefined}
        accessibilityState={{ selected, checked: selected, disabled }}
        disabled={disabled}
        onPress={onSelect}
        style={styles.main}>
        <View style={[styles.position, selected && styles.positionSelected]}>
          <AppText style={[styles.positionText, selected && styles.positionTextSelected]}>{idea.position}</AppText>
        </View>
        <View style={styles.body}>
          <View style={styles.tags}>
            {idea.content_type ? <Tag text={humanLabel(t.contentTypes, idea.content_type)} /> : null}
            {idea.verification_level ? <Tag text={humanLabel(t.verification, idea.verification_level)} /> : null}
          </View>
          <AppText style={styles.title}>{idea.title}</AppText>
          <View style={styles.hook}>
            <FontAwesomeIcon icon={faQuoteLeft} size={10} color={colors.muted} />
            <AppText style={styles.hookText}>{idea.hook}</AppText>
          </View>
          <AppText variant="small">
            <AppText variant="small" style={styles.strong}>{`${t.sections.angle} : `}</AppText>
            {idea.angle}
          </AppText>
        </View>
        <View style={styles.side}>
          {score !== null ? (
            <View style={styles.score}>
              <AppText style={styles.scoreValue}>{score}</AppText>
              <AppText variant="small">{t.outOf10}</AppText>
            </View>
          ) : null}
          <FontAwesomeIcon icon={selected ? faCircleCheck : farCircle} size={22} color={colors.primary} />
        </View>
      </Pressable>

      {hasDetails(idea) ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            accessibilityLabel={open ? t.hideDetails : t.details}
            onPress={() => setOpen(!open)}
            style={styles.toggle}>
            <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} size={12} color={colors.primary} />
            <AppText style={styles.toggleText}>{open ? t.hideDetails : t.details}</AppText>
          </Pressable>
          {open ? <IdeaDetails idea={idea} /> : null}
        </>
      ) : null}
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View style={styles.tag}>
      <AppText style={styles.tagText}>{text}</AppText>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item, index) => (
        <AppText key={index} variant="small" style={styles.detailText} selectable>
          {`• ${item}`}
        </AppText>
      ))}
    </>
  );
}

function IdeaDetails({ idea }: { idea: Idea }) {
  const details = Object.entries(idea.details);
  return (
    <View style={styles.details}>
      {idea.platform_fit ? (
        <Section title={t.sections.platformFit}>
          <AppText variant="small" style={styles.detailText} selectable>
            {idea.platform_fit}
          </AppText>
        </Section>
      ) : null}
      {idea.key_facts.length > 0 ? (
        <Section title={t.sections.keyFacts}>
          <Bullets items={idea.key_facts} />
        </Section>
      ) : null}
      {idea.sources.length > 0 ? (
        <Section title={t.sections.sources}>
          {idea.sources.map((source, index) => (
            <Source key={index} source={source} />
          ))}
        </Section>
      ) : null}
      {details.length > 0 ? (
        <Section title={t.sections.specifics}>
          {details.map(([key, value]) => (
            <View key={key} style={styles.detailEntry}>
              <AppText variant="small" style={styles.strong}>
                {humanLabel(t.detailKeys, key)}
              </AppText>
              <DetailValue value={value} />
            </View>
          ))}
        </Section>
      ) : null}
      {idea.risks.length > 0 ? (
        <Section title={t.sections.risks}>
          <View style={styles.risks}>
            <Bullets items={idea.risks} />
          </View>
        </Section>
      ) : null}
    </View>
  );
}

function Source({ source }: { source: IdeaSource }) {
  const title = source.title || source.url || '';
  const meta = [source.kind, source.date].filter(Boolean).join(' · ');
  return (
    <View>
      {isHttpUrl(source.url) ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t.openSource(title)}
          onPress={() => Linking.openURL(source.url as string)}
          style={styles.link}>
          <AppText variant="small" style={styles.linkText}>
            {title}
          </AppText>
        </Pressable>
      ) : (
        <AppText variant="small" style={styles.strong}>
          {title}
        </AppText>
      )}
      {meta ? <AppText variant="small">{meta}</AppText> : null}
    </View>
  );
}

/** Rendu générique des détails propres au type de contenu : texte, liste ou sous-objet. */
function DetailValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <AppText variant="small">{t.noScore}</AppText>;
  if (Array.isArray(value)) {
    return <Bullets items={value.map((item) => (typeof item === 'string' ? item : JSON.stringify(item)))} />;
  }
  if (typeof value === 'object') {
    return (
      <View style={styles.nested}>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <View key={key}>
            <AppText variant="small" style={styles.strong}>
              {humanLabel(t.detailKeys, key)}
            </AppText>
            <DetailValue value={item} />
          </View>
        ))}
      </View>
    );
  }
  return (
    <AppText variant="small" style={styles.detailText} selectable>
      {String(value)}
    </AppText>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  cardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  main: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, padding: space.lg, minHeight: touch.min },
  position: {
    width: 36,
    height: 36,
    borderRadius: radius.field,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionSelected: { backgroundColor: colors.primary },
  positionText: { fontFamily: font.bold, color: colors.primary },
  positionTextSelected: { color: colors.onPrimary },
  body: { flex: 1, gap: space.xs },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tag: { backgroundColor: colors.sidebar, borderRadius: 6, paddingHorizontal: space.sm, paddingVertical: 2 },
  tagText: { fontFamily: font.medium, fontSize: 12, color: colors.inkSoft },
  title: { fontFamily: font.bold, fontSize: 16 },
  hook: { flexDirection: 'row', gap: space.xs, alignItems: 'flex-start' },
  hookText: { flex: 1, fontSize: fontSize.small, color: colors.inkSoft },
  strong: { fontFamily: font.medium, color: colors.inkSoft },
  side: { alignItems: 'center', gap: space.sm },
  score: { alignItems: 'center' },
  scoreValue: { fontFamily: font.bold, fontSize: 20, color: colors.success },
  toggle: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  toggleText: { fontFamily: font.medium, fontSize: fontSize.small, color: colors.primary },
  details: { gap: space.lg, paddingHorizontal: space.lg, paddingBottom: space.lg },
  section: { gap: space.xs },
  sectionTitle: { fontFamily: font.bold, fontSize: 12, color: colors.muted, textTransform: 'uppercase' },
  detailText: { color: colors.inkSoft },
  detailEntry: { gap: 2 },
  nested: { gap: space.xs, borderLeftWidth: 2, borderLeftColor: colors.line, paddingLeft: space.sm },
  risks: { backgroundColor: colors.warningBg, borderRadius: radius.field, padding: space.sm, gap: 2 },
  link: { minHeight: touch.min, justifyContent: 'center' },
  linkText: { fontFamily: font.medium, color: colors.primary, textDecorationLine: 'underline' },
});
