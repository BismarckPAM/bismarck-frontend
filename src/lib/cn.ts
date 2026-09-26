/**
 * Tiny class-name joiner (no external deps).
 * Joins truthy string/undefined/null arguments with a space.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
