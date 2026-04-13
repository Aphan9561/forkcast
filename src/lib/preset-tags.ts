/**
 * Suggested tag names shown in the TagPicker. Presets are not seeded into the
 * database — they're assigned on first click, so users who never touch them
 * don't accumulate empty tags.
 */
export const PRESET_TAGS: readonly string[] = [
  "quick",
  "weeknight",
  "meal prep",
  "vegetarian",
  "comfort food",
  "family favorite",
] as const;
