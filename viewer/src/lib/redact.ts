/**
 * The public/private rule: a key beginning with `_` is internal, at any depth.
 *
 * Entries may carry internal fields (e.g. `_note`, `_internal`). The models
 * accept any `_`-prefixed key, so this is a prefix rule rather than a denylist.
 *
 * Redaction runs once, at ingest, into a separate file that public pages read
 * instead of the full one, so there is no per-render filter to get wrong.
 */

/**
 * True only for the object shapes `yaml.parse` produces: `{}` literals and
 * prototype-less objects. Anything else object-like throws, because a `Date`,
 * `Map`, `Set` or `RegExp` has no own enumerable keys and would otherwise be
 * silently copied as `{}`.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value === 'function') {
    throw new TypeError('redact received a function; only yaml.parse output is accepted.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;

  const proto = Object.getPrototypeOf(value) as object | null;
  if (proto === Object.prototype || proto === null) return true;

  throw new TypeError(
    `redact received a non-plain object (${value.constructor?.name ?? 'unknown'}); ` +
      'only yaml.parse output is accepted.',
  );
}

/** True for an internal key: any key beginning with `_`. */
export function isInternalKey(key: string): boolean {
  return key.startsWith('_');
}

/**
 * A deep copy with every `_`-prefixed key removed, at every depth, including
 * inside arrays. The input is never mutated: ingest writes the private
 * artifact from the same object.
 */
export function redact<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as unknown as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (isInternalKey(key)) continue;
      out[key] = redact(item);
    }
    return out as T;
  }

  return value;
}

/** Every path at which an internal key appears. Used by the tests and the post-build scanner. */
export function findInternalKeys(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findInternalKeys(item, `${path}[${index}]`));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, item]) => {
      const here = path === '' ? key : `${path}.${key}`;
      return isInternalKey(key) ? [here] : findInternalKeys(item, here);
    });
  }

  return [];
}
