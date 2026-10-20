import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import { useProjects } from '@/api/projects';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { ScreenBackground } from '@/components/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/StateViews';
import { TextField } from '@/components/TextField';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { fr } from '@/i18n/fr';
import { colors, space } from '@/theme/tokens';

import { ProjectCard } from './ProjectCard';

export const SEARCH_DEBOUNCE_MS = 300;

export function ProjectsScreen() {
  const { signOut } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const query = useProjects(search);
  const [refreshing, setRefreshing] = useState(false);

  const projects = useMemo(() => query.data?.pages.flatMap((page) => page.results) ?? [], [query.data]);
  const count = query.data?.pages[0]?.count;

  async function refresh() {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }

  function renderEmpty() {
    if (query.isPending) return <LoadingState label={fr.projects.loading} />;
    if (query.isError) return <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />;
    return <EmptyState message={search ? fr.projects.noMatch(search) : fr.projects.empty} />;
  }

  return (
    <ScreenBackground edges={['top', 'left', 'right']}>
      <FlatList
        testID="projects-list"
        data={projects}
        keyExtractor={(project) => project.id}
        renderItem={({ item }) => (
          <ProjectCard project={item} onPress={() => router.push({ pathname: '/project/[id]', params: { id: item.id } })} />
        )}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="title" accessibilityRole="header">
                {fr.projects.title}
              </AppText>
              <Button variant="link" label={fr.home.signOut} onPress={signOut} />
            </View>
            <Button label={fr.projects.create} onPress={() => router.push('/new')} />
            <TextField
              label={fr.projects.search}
              placeholder={fr.projects.searchPlaceholder}
              value={searchInput}
              onChangeText={setSearchInput}
              returnKeyType="search"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {count !== undefined && projects.length > 0 ? (
              <AppText variant="small">{fr.projects.count(count)}</AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <ActivityIndicator
              color={colors.primary}
              accessibilityLabel={fr.projects.loadingMore}
              style={styles.footer}
            />
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: space.lg },
  header: { gap: space.md, marginBottom: space.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  separator: { height: space.md },
  footer: { paddingVertical: space.lg },
});
