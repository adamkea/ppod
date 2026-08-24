import { Image, View } from 'react-native';

import { useSetIcon } from '@/hooks/useSets';
import { tintSvg } from '@/lib/scryfall';
import { colors } from '@/theme';
import type { SetSymbolProps } from './SetSymbol';

// Web build of SetSymbol: react-native-web's <Image> renders svg markup passed
// as a `data:image/svg+xml;utf8,` uri, so react-native-svg stays off the web
// bundle. The markup goes in *raw* — react-native-web url-encodes it itself
// (resolveAssetUri), and encoding it here first double-encodes it into a
// broken image.
export function SetSymbol({ uri, size = 16, color, label }: SetSymbolProps) {
  const icon = useSetIcon(uri);
  const box = { width: size, height: size };

  if (!icon.data) return <View style={box} />;

  const svg = tintSvg(icon.data, color ?? colors.text);
  return (
    <Image
      source={{ uri: `data:image/svg+xml;utf8,${svg}` }}
      style={box}
      resizeMode="contain"
      accessibilityLabel={label ? `${label} set symbol` : undefined}
    />
  );
}
