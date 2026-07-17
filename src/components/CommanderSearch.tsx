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

import { radius, spacing } from '@/theme';

export interface SavedCommanderOption {
  id: string;
  label: string;
}

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
  /** Saved decks offered in a dropdown before the user starts typing a search. */
  savedOptions?: SavedCommanderOption[];
  onSelectSaved?: (id: string) => void;
}

// Scryfall autocomplete filtered to commander-legal cards
async function fetchSuggestions(query: string): Promise<string[]> {
  if (query.length < 2) return [];
  const url = `https://api.scryfall.com/cards/search?q=is%3Acommander+${encodeURIComponent(query)}&order=name&unique=cards&select=name`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  // Return up to 20 card names
  return (json.data as { name: string }[]).slice(0, 20).map((c) => c.name);
}

export function CommanderSearch({
  value,
  onChange,
  placeholder = 'Commander (optional)',
  savedOptions = [],
  onSelectSaved,
}: Props) {
  const theme = useTheme();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local query in sync if parent resets value (e.g. form clear)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  function openSavedDropdown() {
    if (savedOptions.length === 0) return;
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setShowSaved(true);
    setOpen(true);
  }

  function closeDropdown() {
    setOpen(false);
    setShowSaved(false);
  }

  function handleChangeText(text: string) {
    setQuery(text);
    onChange(text); // keep parent state current even for free-typed values

    if (debounce.current) clearTimeout(debounce.current);

    if (text.length < 2) {
      setSuggestions([]);
      // With the field cleared, fall back to offering the saved decks.
      if (savedOptions.length > 0) openSavedDropdown();
      else closeDropdown();
      return;
    }

    setShowSaved(false);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await fetchSuggestions(text);
        setSuggestions(results);
        setOpen(results.length > 0);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleFocus() {
    if (query.trim().length < 2) openSavedDropdown();
  }

  function handleBlur() {
    // Delay so a tap on a dropdown row still lands before it unmounts.
    if (blurTimer.current) clearTimeout(blurTimer.current);
    blurTimer.current = setTimeout(closeDropdown, 250);
  }

  function selectSuggestion(name: string) {
    setQuery(name);
    onChange(name);
    setSuggestions([]);
    closeDropdown();
  }

  function selectSaved(id: string) {
    closeDropdown();
    onSelectSaved?.(id); // parent pushes the new value back down via `value`
  }

  const itemCount = showSaved ? savedOptions.length : suggestions.length;

  return (
    <View style={styles.container}>
      <TextInput
        mode="outlined"
        dense
        value={query}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        right={
          loading ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={18} />} />
          ) : savedOptions.length > 0 ? (
            <TextInput.Icon
              icon={open && showSaved ? 'menu-up' : 'menu-down'}
              forceTextInputFocus={false}
              onPress={() => (open && showSaved ? closeDropdown() : openSavedDropdown())}
            />
          ) : undefined
        }
      />

      {open ? (
        <Surface
          mode="flat"
          elevation={4}
          style={[styles.dropdown, itemCount > 5 && styles.dropdownScroll]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={itemCount > 5}
            nestedScrollEnabled
          >
            {showSaved ? (
              <>
                <Text
                  variant="labelSmall"
                  style={[styles.dropdownHeading, { color: theme.colors.onSurfaceVariant }]}
                >
                  Saved commanders
                </Text>
                {savedOptions.map((option, index) => (
                  <View key={option.id}>
                    <TouchableRipple
                      style={styles.suggestion}
                      onPress={() => selectSaved(option.id)}
                    >
                      <Text variant="bodyMedium">{option.label}</Text>
                    </TouchableRipple>
                    {index < savedOptions.length - 1 ? <Divider /> : null}
                  </View>
                ))}
              </>
            ) : (
              suggestions.map((item, index) => (
                <View key={item}>
                  <TouchableRipple style={styles.suggestion} onPress={() => selectSuggestion(item)}>
                    <Text variant="bodyMedium">{item}</Text>
                  </TouchableRipple>
                  {index < suggestions.length - 1 ? <Divider /> : null}
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
  container: { position: 'relative', zIndex: 10 },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 8, // Android stacking
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownHeading: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
