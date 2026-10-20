import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useIsMutating } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { errorMessage } from '@/api/errors';
import { useChooseIdea, useGenerateIdeas, useProject } from '@/api/projects';
import { queryKeys } from '@/api/queryKeys';
import type { Project } from '@/api/types';
import { AgentLoading } from '@/components/AgentLoading';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { IdeaCard } from '@/components/IdeaCard';
import { Notice } from '@/components/Notice';
import { ScreenBackground } from '@/components/Screen';
import { ErrorState, LoadingState } from '@/components/StateViews';
import { StatusBadge } from '@/components/StatusBadge';
import { networkColor, networkIcon, stepFromStatus, visibleSafetyAlerts } from '@/domain/project';
import { useConfirmable } from '@/hooks/useConfirmable';
import { fr } from '@/i18n/fr';
import { font } from '@/theme/fonts';
import { colors, radius, space } from '@/theme/tokens';

/** Pendant qu'un agent tourne côté serveur sans appel en cours ici (écran rouvert), le projet est relu régulièrement. */
export const RUNNING_POLL_MS = 5000;

type Props = { id: string; autoGenerate?: boolean };

export function ProjectScreen({ id, autoGenerate = false }: Props) {
  const query = useProject(id);
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  if (query.isPending) {
    return (
      <ScreenBackground edges={['left', 'right']}>
        <LoadingState label={fr.project.loading} />
      </ScreenBackground>
    );
  }
  if (query.isError) {
    return (
      <ScreenBackground edges={['left', 'right']}>
        <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }>
        <ProjectView project={query.data} autoGenerate={autoGenerate} onRefetch={query.refetch} />
      </ScrollView>
    </ScreenBackground>
  );
}

function ProjectView({
  project,
  autoGenerate,
  onRefetch,
}: {
  project: Project;
  autoGenerate: boolean;
  onRefetch: () => void;
}) {
  const generate = useGenerateIdeas(project.id);
  const choose = useChooseIdea(project.id);
  const confirmable = useConfirmable();
  const [error, setError] = useState<string>();
  const [choosingId, setChoosingId] = useState<string | null>(null);

  // Un appel d'agent en cours ici, ou un run « running » côté serveur (écran rouvert pendant une génération)
  const generatingHere = useIsMutating({ mutationKey: queryKeys.agent(project.id, 'ideas') }) > 0;
  const runningOnServer = project.agents.ideas?.status === 'running';
  const generating = generatingHere || runningOnServer;

  useEffect(() => {
    if (!runningOnServer || generatingHere) return;
    const timer = setInterval(onRefetch, RUNNING_POLL_MS);
    return () => clearInterval(timer);
  }, [runningOnServer, generatingHere, onRefetch]);

  function handleError(failure: unknown) {
    setError(errorMessage(failure));
    // RG13 : une génération tourne déjà côté serveur, on relit le projet pour l'afficher
    if (failure instanceof ApiError && failure.code === 'RUN_ALREADY_ACTIVE') onRefetch();
  }

  async function runIdeas() {
    if (generating) return; // double appui ignoré (RG13)
    setError(undefined);
    try {
      await confirmable((confirm) => generate.mutateAsync(confirm));
    } catch (failure) {
      handleError(failure);
    }
  }

  async function chooseIdea(ideaId: string) {
    if (choosingId || generating || ideaId === project.chosen_idea_id) return;
    setError(undefined);
    setChoosingId(ideaId);
    try {
      await confirmable((confirm) => choose.mutateAsync({ ideaId, confirm }));
    } catch (failure) {
      handleError(failure);
    } finally {
      setChoosingId(null);
    }
  }

  // Nouvelle vidéo : l'agent Idées part dès l'ouverture du brouillon, une seule fois
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoGenerate || autoStarted.current || project.status !== 'draft' || runningOnServer) return;
    autoStarted.current = true;
    router.setParams({ generate: undefined });
    runIdeas();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lancement unique à l'ouverture
  }, [autoGenerate, project.status, runningOnServer]);

  return (
    <>
      <Heading project={project} />
      {error && !generating ? <FormAlert message={error} /> : null}
      {generating ? (
        <AgentLoading agent="ideas" />
      ) : project.status === 'draft' ? (
        <View style={styles.card}>
          <AppText>{fr.ideas.draftHint}</AppText>
          <Button label={fr.ideas.generate} onPress={runIdeas} />
        </View>
      ) : (
        <IdeasSection project={project} choosingId={choosingId} onChoose={chooseIdea} onRegenerate={runIdeas} />
      )}
      <BriefCard project={project} />
    </>
  );
}

function Heading({ project }: { project: Project }) {
  const reached = stepFromStatus(project.status);
  return (
    <>
      <View style={styles.heading}>
        <AppText variant="title" accessibilityRole="header">
          {project.title}
        </AppText>
        <StatusBadge status={project.status} />
      </View>
      <View style={styles.card} accessibilityLabel={fr.project.step(reached)} accessible>
        <AppText variant="label">{fr.project.step(reached)}</AppText>
        <View style={styles.steps}>
          {fr.project.steps.map((label, index) => {
            const step = index + 1;
            const done = step < reached;
            const current = step === reached;
            return (
              <View key={label} style={styles.step}>
                <View style={[styles.dot, done && styles.dotDone, current && styles.dotCurrent]}>
                  {done ? (
                    <FontAwesomeIcon icon={faCheck} size={12} color={colors.onPrimary} />
                  ) : (
                    <AppText style={[styles.dotText, current && styles.dotTextCurrent]}>{step}</AppText>
                  )}
                </View>
                <AppText variant="small" style={current ? styles.stepCurrent : undefined}>
                  {label}
                </AppText>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );
}

function IdeasSection({
  project,
  choosingId,
  onChoose,
  onRegenerate,
}: {
  project: Project;
  choosingId: string | null;
  onChoose: (ideaId: string) => void;
  onRegenerate: () => void;
}) {
  const ideas = [...project.ideas].sort((a, b) => a.position - b.position);
  const { interpreted_theme: interpretedTheme, alerts, safety_alerts: safetyAlerts } = project.ideas_context;
  const notices = [...alerts, ...visibleSafetyAlerts(safetyAlerts).map((alert) => fr.ideas.safetyAlert(alert.description))];
  const hasChoice = Boolean(project.chosen_idea_id);

  return (
    <View style={styles.section}>
      <AppText style={styles.sectionTitle} accessibilityRole="header">
        {fr.ideas.title(project.theme)}
      </AppText>
      {interpretedTheme ? (
        <AppText variant="small">
          <AppText variant="small" style={styles.strong}>{`${fr.ideas.interpretedTheme} `}</AppText>
          {interpretedTheme}
        </AppText>
      ) : null}
      {notices.length > 0 ? <Notice title={fr.ideas.alertsTitle} items={notices} /> : null}

      <View accessibilityRole="radiogroup" style={styles.ideas}>
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            selected={idea.id === project.chosen_idea_id}
            disabled={choosingId !== null}
            onSelect={() => onChoose(idea.id)}
          />
        ))}
      </View>
      {choosingId ? (
        <AppText variant="small" accessibilityLiveRegion="polite">
          {fr.ideas.choosing}
        </AppText>
      ) : null}

      <AppText variant="small" style={styles.center}>
        {hasChoice ? fr.ideas.nextOnWeb : fr.ideas.chooseFirst}
      </AppText>
      <Button variant="secondary" label={fr.ideas.regenerate} onPress={onRegenerate} disabled={choosingId !== null} />
    </View>
  );
}

function BriefCard({ project }: { project: Project }) {
  return (
    <View style={styles.card}>
      <AppText variant="label">{fr.project.brief}</AppText>
      <Row label={fr.project.theme} value={project.theme} />
      <View style={styles.row}>
        <AppText variant="small">{fr.project.network}</AppText>
        <View style={styles.network}>
          <FontAwesomeIcon icon={networkIcon[project.network]} size={16} color={networkColor[project.network]} />
          <AppText>{fr.networks[project.network]}</AppText>
        </View>
      </View>
      <Row label={fr.project.duration} value={fr.project.seconds(project.duration_seconds)} />
      <Row label={fr.project.ratio} value={project.ratio} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="small">{label}</AppText>
      <AppText selectable>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, gap: space.lg },
  heading: { gap: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.md,
  },
  section: { gap: space.md },
  sectionTitle: { fontFamily: font.bold, fontSize: 18 },
  strong: { fontFamily: font.medium, color: colors.ink },
  ideas: { gap: space.md },
  center: { textAlign: 'center' },
  steps: { flexDirection: 'row', justifyContent: 'space-between' },
  step: { alignItems: 'center', gap: space.xs, flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotCurrent: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  dotText: { fontFamily: font.medium, color: colors.muted },
  dotTextCurrent: { color: colors.primary },
  stepCurrent: { color: colors.primary, fontFamily: font.medium },
  row: { gap: 2 },
  network: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
