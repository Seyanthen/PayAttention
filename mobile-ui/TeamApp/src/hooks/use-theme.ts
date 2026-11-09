import { Colors } from '@/constants/theme';

export function useTheme() {
  // Keep theme selection behind this hook so a user preference can be added
  // later without changing every component that consumes theme colors.
  return Colors.light;
}
