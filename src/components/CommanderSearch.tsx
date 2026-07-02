import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Divider,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
} from 'react-native-paper';

import { radius, spacing } from '@/theme';

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
      <TextInput
        mode="outlined"
        dense
        value={query}
        onChangeText={handleChangeText}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        right={
          loading ? (
            <TextInput.Icon icon={() => <ActivityIndicator size={18} />} />
          ) : undefined
        }
      />

      {open ? (
        <Surface
          mode="flat"
          elevation={4}
          style={[styles.dropdown, suggestions.length > 5 && styles.dropdownScroll]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            scrollEnabled={suggestions.length > 5}
            nestedScrollEnabled
          >
            {suggestions.map((item, index) => (
              <View key={item}>
                <TouchableRipple style={styles.suggestion} onPress={() => selectSuggestion(item)}>
                  <Text variant="bodyMedium">{item}</Text>
                </TouchableRipple>
                {index < suggestions.length - 1 ? <Divider /> : null}
              </View>
            ))}
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
  suggestion: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
