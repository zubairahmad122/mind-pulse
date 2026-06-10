import { TextStyle } from 'react-native';

export const typography = {
  headingLarge: { fontSize: 28, fontWeight: '700' as const },
  headingMedium: { fontSize: 22, fontWeight: '600' as const },
  headingSmall: { fontSize: 18, fontWeight: '600' as const },
  bodyLarge: { fontSize: 15, fontWeight: '400' as const },
  body: { fontSize: 13, fontWeight: '400' as const },
  caption: { fontSize: 11, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
} satisfies Record<string, TextStyle>;
