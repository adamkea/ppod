import { Image, View } from 'react-native';

import { useSetIcon } from '@/hooks/useSets';
import { tintSvg } from '@/lib/scryfall';
import { colors } from '@/theme';
import type { SetSymbolProps } from './SetSymbol';

// Web build of SetSymbol: react-native-web renders SVG straight from an
// <Image>, so the tinted markup goes in as a data uri and react-native-svg
// stays off the web bundle.
export function SetSymbol({ uri, size = 16, color, label }: SetSymbolProps) {
  const icon = useSetIcon(uri);
  const box = { width: size, height: size };

  if (!icon.data) return <View style={box} />;

  const svg = tintSvg(icon.data, color ?? colors.text);
  return (
    <Image
      source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
      style={box}
      resizeMode="contain"
      accessibilityLabel={label ? `${label} set symbol` : undefined}
    />
  );
}
