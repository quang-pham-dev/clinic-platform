export const SHIFT_PRESET_COLORS = [
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#06B6D4',
  '#6366F1',
] as const;

export const SHIFT_DEFAULT_COLOR = '#22C55E';
export type ShiftColor = (typeof SHIFT_PRESET_COLORS)[number];
