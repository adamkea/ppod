import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Divider,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';

import { useSets } from '@/hooks/useSets';
import type { ScryfallSet } from '@/lib/scryfall';
import { colors, fonts, radius, spacing } from '@/theme';
import { SetSymbol } from './SetSymbol';

// What a caller stores: enough to render the symbol without asking Scryfall
// for the set list again.
export interface SelectedSet {
  code: string;
  name: string;
  iconUri: string | null;
}

interface Props {
  value: SelectedSet | null;
  onChange: (set: SelectedSet | null) => void;
  label?: string;
}

// Rows are cheap but the full list is ~1,000 sets; cap what's rendered at once.
const MAX_ROWS = 40;

function matches(set: ScryfallSet, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return set.name.toLowerCase().includes(q) || set.code.toLowerCase().includes(q);
}

/**
 * Pick the Magic set a series is played in. The whole set list arrives in one
 * request (see `useSets`), so typing filters locally — no per-keystroke round
 * trip — and every row previews its symbol.
 */
export function SetSearch({ value, onChange, label = 'Set (optional)' }: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  // Only fetch the list once the field is actually used.
  const [touched, setTouched] = useState(false);
  const sets = useSets(touched);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Follow the parent if it resets or preselects the field.
  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?.code]);

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  // With a set chosen and the text untouched, browsing should show everything
  // again rather than only the sets matching that one name.
  const browsing = !query.trim() || query === value?.name;
  const results = (sets.data ?? [])
    .filter((s) => browsing || matches(s, query))
    .slice(0, MAX_ROWS);

  function openDropdown() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setTouched(true);
    setOpen(true);
  }

  function handleChangeText(text: string) {
    setQuery(text);
    openDropdown();
    // Clearing the field clears the choice; otherwise the set is only set by
    // picking a row, since a half-typed name isn't a set.
    if (!text.trim() && value) onChange(null);
  }

  function handleBlur() {
    // Delay so a tap on a row still lands before the list unmounts.
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      // Abandoned typing reverts to whatever is actually selected.
      setQuery(value?.name ?? '');
    }, 250);
  }

  function select(set: ScryfallSet) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange({ code: set.code, name: set.name, iconUri: set.iconSvgUri });
    setQuery(set.name);
    setOpen(false);
  }

  function clear() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(null);
    setQuery('');
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        dense
        label={label}
        value={query}
        onChangeText={handleChangeText}
        onFocus={openDropdown}
        onBlur={handleBlur}
        placeholder="e.g. Final Fantasy"
        autoCapitalize="words"
        autoCorrect={false}
        left={
          value ? (
            <TextInput.Icon
              icon={() => <SetSymbol uri={value.iconUri} size={18} label={value.name} />}
              forceTextInputFocus={false}
            />
          ) : undefined
        }
        right={
          sets.isLoading ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={18} />} />
          ) : value ? (
            <TextInput.Icon
              icon="close"
              forceTextInputFocus={false}
              onPress={clear}
              accessibilityLabel="Clear set"
            />
          ) : (
            <TextInput.Icon
              icon={open ? 'menu-up' : 'menu-down'}
              forceTextInputFocus={false}
              onPress={() => (open ? setOpen(false) : openDropdown())}
            />
          )
        }
      />

      {open ? (
        <Surface
          mode="flat"
          elevation={4}
          style={[styles.dropdown, results.length > 5 && styles.dropdownScroll]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={results.length > 5}
            nestedScrollEnabled
          >
            {sets.isLoading ? (
              <Text
                variant="bodySmall"
                style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}
              >
                Loading sets…
              </Text>
            ) : results.length === 0 ? (
              <Text
                variant="bodySmall"
                style={[styles.notice, { color: theme.colors.onSurfaceVariant }]}
              >
                {sets.data?.length ? 'No sets match that.' : 'Could not load sets.'}
              </Text>
            ) : (
              results.map((set, index) => (
                <View key={set.code}>
                  <TouchableRipple style={styles.row} onPress={() => select(set)}>
                    <View style={styles.rowInner}>
                      <SetSymbol uri={set.iconSvgUri} size={18} />
                      <Text variant="bodyMedium" style={styles.rowName} numberOfLines={1}>
                        {set.name}
                      </Text>
                      <Text style={styles.rowCode}>
                        {set.code.toUpperCase()}
                        {set.releasedAt ? ` · ${set.releasedAt.slice(0, 4)}` : ''}
                      </Text>
                    </View>
                  </TouchableRipple>
                  {index < results.length - 1 ? <Divider /> : null}
                </View>
              ))
            )}
          </ScrollView>
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  // In normal flow rather than floating: the same reason CommanderSearch does
  // it — an overlay gets clipped by the surrounding card.
  dropdown: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dropdownScroll: { maxHeight: 260 },
  notice: { padding: spacing.md },
  row: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowName: { flex: 1 },
  rowCode: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textMuted,
  },
});
