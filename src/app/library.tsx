import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card, Chevron, ReviewBadge, Tag } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { ExerciseArt } from '@/components/Illustration';
import { EmptyState, Screen, TopBar } from '@/components/Screen';
import { EQUIPMENT_LABEL, EXERCISES, LEVEL_LABEL, PATTERN_GROUPS, isAvailable, searchExercises } from '@/domain/exercises';
import type { EquipmentId, Exercise } from '@/domain/types';
import { plural } from '@/lib/format';
import { useStore } from '@/state/AppStore';
import { colors, fonts, radius, space } from '@/theme/tokens';

type Filter = 'all' | 'bodyweight' | EquipmentId;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bodyweight', label: 'No equipment' },
  { key: 'dumbbells', label: 'Dumbbells' },
  { key: 'band', label: 'Band' },
];

function matchesFilter(exercise: Exercise, filter: Filter): boolean {
  if (filter === 'all') {
    return true;
  }
  if (filter === 'bodyweight') {
    return exercise.requires.length === 0;
  }
  return exercise.requires.includes(filter);
}

export default function Library() {
  const { data } = useStore();
  const equipment = data.preferences?.equipment ?? [];
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [focused, setFocused] = useState(false);
  const results = useMemo(
    () => searchExercises(EXERCISES, query).filter((exercise) => matchesFilter(exercise, filter)),
    [query, filter],
  );
  const filtered = query.trim().length > 0 || filter !== 'all';

  return (
    <Screen testID="library">
      <TopBar back title="Exercise library" />
      <AppText tone="secondary">
        {EXERCISES.length} movements. Each one covers the setup, the steps, what to check from the side or front, and
        the common mistakes with their fixes.
      </AppText>
      <ReviewBadge />

      <View style={[styles.search, focused && styles.searchFocused]}>
        <Icon name="search" size={18} color={colors.inkSecondary} />
        <TextInput
          testID="library-search"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by name or muscle"
          placeholderTextColor={colors.inkSecondary}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search exercises"
        />
      </View>

      <View style={styles.filters} accessibilityRole="radiogroup" accessibilityLabel="Equipment">
        {FILTERS.map((option) => {
          const selected = option.key === filter;
          return (
            <Pressable
              key={option.key}
              testID={`filter-${option.key}`}
              onPress={() => setFilter(option.key)}
              accessibilityRole="radio"
              aria-checked={selected}
              style={[styles.filter, selected && styles.filterOn]}>
              <AppText variant="caption" style={{ color: selected ? colors.inkOnDark : colors.ink }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {filtered ? (
        <AppText variant="caption" tone="secondary" testID="library-count" accessibilityLiveRegion="polite">
          {results.length === 0 ? 'No matches' : plural(results.length, 'movement')}
        </AppText>
      ) : null}

      {results.length === 0 ? (
        <Card>
          <EmptyState
            title="No exercises match"
            body="Try another word, such as a muscle (glutes) or a movement (row)."
            action="Clear search"
            onAction={() => {
              setQuery('');
              setFilter('all');
            }}
          />
        </Card>
      ) : null}

      {PATTERN_GROUPS.map((group) => {
        const items = results.filter((exercise) => exercise.pattern === group.pattern);
        if (items.length === 0) {
          return null;
        }
        return (
          <View key={group.pattern} style={styles.group} testID={`library-group-${group.pattern}`}>
            <View style={styles.groupHead}>
              <AppText variant="h2" style={styles.flex}>
                {group.title}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {items.length}
              </AppText>
            </View>
            {items.map((exercise) => {
              const available = isAvailable(exercise, equipment);
              const needs = exercise.requires.map((item) => EQUIPMENT_LABEL[item].toLowerCase()).join(' and ');
              return (
                <Card
                  key={exercise.id}
                  testID={`library-${exercise.id}`}
                  style={styles.row}
                  onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
                  accessibilityLabel={`${exercise.name}. ${LEVEL_LABEL[exercise.level]}. ${exercise.summary}${available ? '' : ` Needs ${needs}, which you have not selected.`}`}>
                  <View style={styles.art}>
                    <ExerciseArt exercise={exercise} kind="thumb" size={72} />
                  </View>
                  <View style={styles.text}>
                    <AppText variant="bodyStrong">{exercise.name}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={2}>
                      {exercise.summary}
                    </AppText>
                    <View style={styles.tags}>
                      <Tag label={LEVEL_LABEL[exercise.level]} tint={exercise.level === 1 ? 'mint' : exercise.level === 2 ? 'blue' : 'lavender'} />
                      {!available ? <Tag label={`Needs ${needs}`} tint="butter" /> : null}
                    </View>
                  </View>
                  <Chevron />
                </Card>
              );
            })}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    minHeight: 48,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  // The field's border shows focus, so the browser's own outline is turned off on web.
  searchFocused: { borderColor: colors.ink },
  input: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: space.xs,
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } : null),
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  filter: {
    minHeight: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  group: { gap: space.sm },
  groupHead: { flexDirection: 'row', alignItems: 'baseline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  art: { width: 76, alignItems: 'center' },
  text: { flex: 1, gap: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xxs },
});
