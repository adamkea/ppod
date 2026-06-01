import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, fontSize, radius, spacing } from '@/theme';

interface Props {
  value: string;
  onChange: (name: string) => void;
  placeholder?: string;
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

export function CommanderSearch({ value, onChange, placeholder = 'Commander (optional)' }: Props) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local query in sync if parent resets value (e.g. form clear)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  function handleChangeText(text: string) {
    setQuery(text);
    onChange(text); // keep parent state current even for free-typed values

    if (debounce.current) clearTimeout(debounce.current);

    if (text.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

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

  function selectSuggestion(name: string) {
    setQuery(name);
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
        ) : null}
      </View>

      {open ? (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={suggestions.length > 5}
            style={suggestions.length > 5 ? styles.dropdownScroll : undefined}
            renderItem={({ item, index }) => (
              <Pressable
                style={[
                  styles.suggestion,
                  index < suggestions.length - 1 && styles.suggestionBorder,
                ]}
                onPress={() => selectSuggestion(item)}
              >
                <Text style={styles.suggestionText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', zIndex: 10 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: fontSize.md,
  },
  spinner: { marginLeft: spacing.sm },
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 100,
    elevation: 8, // Android shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  dropdownScroll: { maxHeight: 220 },
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontSize: fontSize.md,
  },
});
