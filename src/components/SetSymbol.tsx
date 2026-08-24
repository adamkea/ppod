import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { useSetIcon } from '@/hooks/useSets';
import { tintSvg } from '@/lib/scryfall';
import { colors } from '@/theme';

export interface SetSymbolProps {
  /** Scryfall `icon_svg_uri` for the set. */
  uri: string | null | undefined;
  size?: number;
  color?: string;
  /** Set name, for screen readers. */
  label?: string | null;
}

// A Magic set symbol, rendered from Scryfall's SVG and tinted to sit in the
// surrounding text. The box is reserved while the SVG loads (and kept if it
// never does) so a row's layout doesn't jump.
export function SetSymbol({ uri, size = 16, color, label }: SetSymbolProps) {
  const icon = useSetIcon(uri);
  const box = { width: size, height: size };

  if (!icon.data) return <View style={box} />;

  return (
    <View
      style={box}
      accessible={!!label}
      accessibilityRole="image"
      accessibilityLabel={label ? `${label} set symbol` : undefined}
    >
      <SvgXml
        xml={tintSvg(icon.data, color ?? colors.text)}
        width={size}
        height={size}
      />
    </View>
  );
}
