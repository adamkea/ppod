import { forwardRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { TextInput } from 'react-native-paper';

type TextFieldProps = Omit<
  React.ComponentProps<typeof TextInput>,
  'mode' | 'theme'
>;

export const TextField = forwardRef<RNTextInput, TextFieldProps>(
  (props, ref) => {
    return <TextInput ref={ref} mode="outlined" {...props} />;
  },
);

TextField.displayName = 'TextField';
