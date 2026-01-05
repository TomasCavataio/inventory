export function parseEnum<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): T[keyof T] | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const values = Object.values(enumObject) as string[];
  return values.includes(value) ? (value as T[keyof T]) : undefined;
}
