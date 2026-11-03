export type DataErrorKind =
  | 'missingFile'
  | 'corrupt'
  | 'schemaMismatch'
  | 'unreadable';

/**
 * An error loading customer data. `message` is technical (safe to log: it
 * never contains customer fields); use `userMessage` for the UI.
 */
export class DataError extends Error {
  readonly kind: DataErrorKind;

  constructor(kind: DataErrorKind, message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'DataError';
    this.kind = kind;
    if (options && 'cause' in options) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  get userMessage(): string {
    return userMessageFor(this.kind);
  }
}

export function userMessageFor(kind: DataErrorKind): string {
  switch (kind) {
    case 'missingFile':
      return 'The customer database could not be found.';
    case 'corrupt':
      return 'The customer database is damaged and cannot be read.';
    case 'schemaMismatch':
      return 'The customer database is not in the expected format.';
    case 'unreadable':
      return 'Customer data could not be loaded.';
  }
}

function errorText(e: unknown): string {
  // Duck-typed on purpose: errors thrown by native/JSI code (or another JS
  // realm) are often not `instanceof Error` but still carry a message.
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message: unknown }).message;
    if (typeof m === 'string') {
      return m;
    }
  }
  return typeof e === 'string' ? e : 'Unknown error';
}

/** Maps a raw SQLite / native error to a DataError kind. */
export function toDataError(e: unknown): DataError {
  if (e instanceof DataError) {
    return e;
  }
  const msg = errorText(e);
  const lower = msg.toLowerCase();
  let kind: DataErrorKind = 'unreadable';
  if (
    lower.includes('not a database') ||
    lower.includes('malformed') ||
    lower.includes('corrupt')
  ) {
    kind = 'corrupt';
  } else if (lower.includes('no such table') || lower.includes('no such column')) {
    kind = 'schemaMismatch';
  } else if (
    lower.includes('unable to open') ||
    lower.includes('no such file') ||
    lower.includes('does not exist') ||
    lower.includes("doesn't exist") ||
    lower.includes('cannot open')
  ) {
    kind = 'missingFile';
  }
  // Keep the message short; SQLite messages never include row values.
  return new DataError(kind, msg.slice(0, 300), { cause: e });
}
