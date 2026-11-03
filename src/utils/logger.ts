/**
 * App logger. RULE: never pass customer names, addresses or phone numbers.
 * Log counts, timings and error kinds only.
 */
type Meta = Record<string, string | number | boolean | null | undefined>;

export const logger = {
  info(event: string, meta?: Meta): void {
    console.log(`[CustomerMap] ${event}`, meta ? JSON.stringify(meta) : '');
  },
  /**
   * Handled problems (bad data, offline...). Uses console.log, not
   * console.warn: in dev, console.warn raises a LogBox toast that covers
   * the app's own error UI.
   */
  warn(event: string, meta?: Meta): void {
    console.log(`[CustomerMap] WARN ${event}`, meta ? JSON.stringify(meta) : '');
  },
};
